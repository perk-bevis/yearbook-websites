"""Multi-class REST API for the existing Clerk + FastAPI + psycopg2 project.

Register in artifacts/api-server/main.py:
    from routers import classes
    app.include_router(classes.router, prefix=PREFIX)
"""
import hashlib
import json
import re
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import require_user
from database import get_db, row_to_dict, rows_to_list

router = APIRouter(tags=["platform-classes"])


def _hash_join_code(code: str) -> str:
    return hashlib.sha256(code.upper().strip().encode("utf-8")).hexdigest()


def _membership(cur, class_id: int, user_id: str):
    cur.execute(
        """SELECT role, status FROM platform_class_members
           WHERE class_id = %s AND clerk_user_id = %s""",
        (class_id, user_id),
    )
    return cur.fetchone()


def _require_class_manager(cur, class_id: int, user_id: str):
    cur.execute(
        """SELECT role FROM platform_class_members
           WHERE class_id = %s AND clerk_user_id = %s AND status = 'active'""",
        (class_id, user_id),
    )
    row = cur.fetchone()
    if not row or row[0] not in ("class_admin", "teacher"):
        raise HTTPException(status_code=403, detail="Bạn không có quyền quản lý lớp này")


class CreateSchoolRequest(BaseModel):
    name: str = Field(min_length=2, max_length=180)


class CreateClassRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    academic_year: str = Field(min_length=2, max_length=40)
    school_id: Optional[int] = None
    description: str = Field(default="", max_length=2000)


class JoinClassRequest(BaseModel):
    code: str = Field(min_length=6, max_length=16)


class UpdateClassRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=2000)
    allow_student_direct_messages: Optional[bool] = None
    group_chat_teacher_only: Optional[bool] = None


class RoleChangeRequest(BaseModel):
    role: str = Field(pattern="^(class_admin|teacher|class_officer|student|parent)$")


class TeacherApplicationRequest(BaseModel):
    school_name: Optional[str] = Field(default=None, max_length=180)
    class_name: Optional[str] = Field(default=None, max_length=100)
    message: str = Field(default="", max_length=2000)


@router.post("/platform/schools", status_code=201)
def create_school(body: CreateSchoolRequest, user_id: str = Depends(require_user)):
    name = body.name.strip()
    slug_base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:100] or "school"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM platform_schools WHERE slug = %s", (slug_base,))
        slug = slug_base if not cur.fetchone() else f"{slug_base}-{secrets.token_hex(3)}"
        cur.execute(
            """INSERT INTO platform_schools(name, slug, created_by_clerk_id)
               VALUES (%s, %s, %s) RETURNING *""",
            (name, slug, user_id),
        )
        return row_to_dict(cur, cur.fetchone())


@router.get("/platform/classes")
def list_my_classes(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT c.id, c.name, c.academic_year, c.description, c.school_id,
                      c.allow_student_direct_messages, c.group_chat_teacher_only,
                      c.archived_at, cm.role, cm.status, cm.joined_at
               FROM platform_classes c
               JOIN platform_class_members cm ON cm.class_id = c.id
               WHERE cm.clerk_user_id = %s AND cm.status IN ('active','pending')
               ORDER BY c.created_at DESC""",
            (user_id,),
        )
        return rows_to_list(cur, cur.fetchall())


@router.post("/platform/classes", status_code=201)
def create_class(body: CreateClassRequest, user_id: str = Depends(require_user)):
    code = secrets.token_urlsafe(8).replace("-", "").replace("_", "").upper()[:10]
    with get_db() as conn:
        cur = conn.cursor()
        if body.school_id is not None:
            cur.execute("SELECT 1 FROM platform_schools WHERE id = %s", (body.school_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy trường")
        cur.execute(
            """INSERT INTO platform_classes(
                 school_id, name, academic_year, description, join_code_hash, created_by_clerk_id
               ) VALUES (%s, %s, %s, %s, %s, %s)
               RETURNING id, school_id, name, academic_year, description, created_at""",
            (body.school_id, body.name.strip(), body.academic_year.strip(),
             body.description.strip(), _hash_join_code(code), user_id),
        )
        klass = row_to_dict(cur, cur.fetchone())
        cur.execute(
            """INSERT INTO platform_class_members(class_id, clerk_user_id, role, status)
               VALUES (%s, %s, 'class_admin', 'active')""",
            (klass["id"], user_id),
        )
        cur.execute(
            """INSERT INTO platform_audit_logs(actor_clerk_id, action, target_type, target_id)
               VALUES (%s, 'class.create', 'class', %s)""",
            (user_id, str(klass["id"])),
        )
        klass["join_code"] = code
        return klass


@router.post("/platform/classes/join")
def join_class(body: JoinClassRequest, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, name FROM platform_classes
               WHERE join_code_hash = %s AND archived_at IS NULL""",
            (_hash_join_code(body.code),),
        )
        klass = cur.fetchone()
        if not klass:
            raise HTTPException(status_code=404, detail="Mã lớp không hợp lệ hoặc đã hết hiệu lực")
        cur.execute(
            """INSERT INTO platform_class_members(class_id, clerk_user_id, role, status)
               VALUES (%s, %s, 'student', 'active')
               ON CONFLICT (class_id, clerk_user_id) DO UPDATE
                 SET status = CASE
                   WHEN platform_class_members.status = 'removed' THEN 'active'
                   ELSE platform_class_members.status
                 END
               RETURNING role, status""",
            (klass[0], user_id),
        )
        member = cur.fetchone()
        cur.execute(
            """INSERT INTO platform_audit_logs(actor_clerk_id, action, target_type, target_id)
               VALUES (%s, 'class.join', 'class', %s)""",
            (user_id, str(klass[0])),
        )
        return {"class_id": klass[0], "class_name": klass[1], "role": member[0], "status": member[1]}


@router.get("/platform/classes/{class_id}/members")
def list_class_members(class_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        membership = _membership(cur, class_id, user_id)
        if not membership or membership[1] != "active":
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp")
        cur.execute(
            """SELECT m.clerk_user_id, m.role, m.status, m.joined_at,
                      u.full_name, u.nickname, u.photo_url
               FROM platform_class_members m
               LEFT JOIN app_users u ON u.clerk_user_id = m.clerk_user_id
               WHERE m.class_id = %s AND m.status = 'active'
               ORDER BY CASE m.role WHEN 'class_admin' THEN 0 WHEN 'teacher' THEN 1 ELSE 2 END,
                        COALESCE(u.full_name, u.nickname, m.clerk_user_id)""",
            (class_id,),
        )
        return rows_to_list(cur, cur.fetchall())


@router.patch("/platform/classes/{class_id}")
def update_class(class_id: int, body: UpdateClassRequest, user_id: str = Depends(require_user)):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Không có thay đổi")
    with get_db() as conn:
        cur = conn.cursor()
        _require_class_manager(cur, class_id, user_id)
        columns, values = [], []
        for col, val in updates.items():
            columns.append(f"{col} = %s")
            values.append(val.strip() if isinstance(val, str) else val)
        values.append(class_id)
        cur.execute(
            f"UPDATE platform_classes SET {', '.join(columns)} WHERE id = %s RETURNING *",
            values,
        )
        klass = row_to_dict(cur, cur.fetchone())
        if not klass:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp")
        cur.execute(
            """INSERT INTO platform_audit_logs(actor_clerk_id, action, target_type, target_id, metadata)
               VALUES (%s, 'class.update', 'class', %s, %s::jsonb)""",
            (user_id, str(class_id), json.dumps(list(updates.keys()))),
        )
        return klass


@router.post("/platform/classes/{class_id}/rotate-join-code")
def rotate_join_code(class_id: int, user_id: str = Depends(require_user)):
    code = secrets.token_urlsafe(8).replace("-", "").replace("_", "").upper()[:10]
    with get_db() as conn:
        cur = conn.cursor()
        _require_class_manager(cur, class_id, user_id)
        cur.execute(
            "UPDATE platform_classes SET join_code_hash = %s WHERE id = %s RETURNING id, name",
            (_hash_join_code(code), class_id),
        )
        klass = cur.fetchone()
        if not klass:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp")
        cur.execute(
            """INSERT INTO platform_audit_logs(actor_clerk_id, action, target_type, target_id)
               VALUES (%s, 'class.rotate_join_code', 'class', %s)""",
            (user_id, str(class_id)),
        )
        return {"class_id": klass[0], "class_name": klass[1], "join_code": code}


@router.patch("/platform/classes/{class_id}/members/{member_id}/role")
def change_member_role(class_id: int, member_id: str, body: RoleChangeRequest, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        _require_class_manager(cur, class_id, user_id)
        cur.execute(
            """SELECT role, status FROM platform_class_members
               WHERE class_id = %s AND clerk_user_id = %s FOR UPDATE""",
            (class_id, member_id),
        )
        target = cur.fetchone()
        if not target or target[1] != "active":
            raise HTTPException(status_code=404, detail="Không tìm thấy thành viên")
        if target[0] == "class_admin" and body.role != "class_admin":
            cur.execute(
                """SELECT COUNT(*) FROM platform_class_members
                   WHERE class_id = %s AND role = 'class_admin' AND status = 'active'""",
                (class_id,),
            )
            if cur.fetchone()[0] <= 1:
                raise HTTPException(status_code=409, detail="Lớp phải có ít nhất một admin")
        cur.execute(
            """UPDATE platform_class_members SET role = %s
               WHERE class_id = %s AND clerk_user_id = %s RETURNING *""",
            (body.role, class_id, member_id),
        )
        updated = row_to_dict(cur, cur.fetchone())
        cur.execute(
            """INSERT INTO platform_audit_logs(actor_clerk_id, action, target_type, target_id, metadata)
               VALUES (%s, 'class.member.role_change', 'member', %s, %s::jsonb)""",
            (user_id, f"{class_id}:{member_id}", json.dumps({"role": body.role})),
        )
        return updated


@router.delete("/platform/classes/{class_id}/members/{member_id}")
def remove_class_member(class_id: int, member_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        _require_class_manager(cur, class_id, user_id)
        cur.execute(
            """SELECT role FROM platform_class_members
               WHERE class_id = %s AND clerk_user_id = %s AND status = 'active' FOR UPDATE""",
            (class_id, member_id),
        )
        target = cur.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy thành viên")
        if target[0] == "class_admin":
            cur.execute(
                """SELECT COUNT(*) FROM platform_class_members
                   WHERE class_id = %s AND role = 'class_admin' AND status = 'active'""",
                (class_id,),
            )
            if cur.fetchone()[0] <= 1:
                raise HTTPException(status_code=409, detail="Không thể xóa admin cuối cùng")
        cur.execute(
            """UPDATE platform_class_members SET status = 'removed'
               WHERE class_id = %s AND clerk_user_id = %s""",
            (class_id, member_id),
        )
        cur.execute(
            """INSERT INTO platform_audit_logs(actor_clerk_id, action, target_type, target_id)
               VALUES (%s, 'class.member.remove', 'member', %s)""",
            (user_id, f"{class_id}:{member_id}"),
        )
    return {"ok": True}


@router.post("/platform/teacher-applications", status_code=201)
def apply_teacher(body: TeacherApplicationRequest, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT id FROM platform_teacher_approvals
               WHERE clerk_user_id = %s AND status = 'pending'""",
            (user_id,),
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Bạn đã có yêu cầu chờ duyệt")
        cur.execute(
            """INSERT INTO platform_teacher_approvals(clerk_user_id, school_name, class_name, message)
               VALUES (%s, %s, %s, %s) RETURNING *""",
            (user_id, body.school_name, body.class_name, body.message.strip()),
        )
        return row_to_dict(cur, cur.fetchone())


@router.get("/platform/teacher-applications/mine")
def my_teacher_applications(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, school_name, class_name, message, status, requested_at, reviewed_at, review_note
               FROM platform_teacher_approvals WHERE clerk_user_id = %s
               ORDER BY requested_at DESC""",
            (user_id,),
        )
        return rows_to_list(cur, cur.fetchall())
