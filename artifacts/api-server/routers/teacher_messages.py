from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_db, row_to_dict, rows_to_list
from auth import require_user

router = APIRouter(tags=["teacher-messages"])


class TeacherMessageInput(BaseModel):
    teacher_name: str
    subject: Optional[str] = None
    message: str
    photo_url: Optional[str] = None


class TeacherMessageUpdate(BaseModel):
    teacher_name: Optional[str] = None
    subject: Optional[str] = None
    message: Optional[str] = None
    photo_url: Optional[str] = None


@router.get("/teacher-messages")
def list_teacher_messages():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM teacher_messages ORDER BY created_at ASC")
            return rows_to_list(cur, cur.fetchall())


@router.post("/teacher-messages", status_code=201)
def create_teacher_message(data: TeacherMessageInput, clerk_user_id: str = Depends(require_user)):
    """Only logged-in users with role=teacher may post."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT role FROM app_users WHERE clerk_user_id = %s", (clerk_user_id,))
            row = cur.fetchone()
            if not row or row[0] != "teacher":
                raise HTTPException(status_code=403, detail="Chỉ giáo viên mới có thể đăng lời nhắn")
            cur.execute(
                """INSERT INTO teacher_messages (teacher_name, subject, message, photo_url)
                   VALUES (%s, %s, %s, %s) RETURNING *""",
                (data.teacher_name, data.subject, data.message, data.photo_url),
            )
            return row_to_dict(cur, cur.fetchone())


@router.put("/teacher-messages/{id}")
def update_teacher_message(id: int, data: TeacherMessageUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
    with get_db() as conn:
        with conn.cursor() as cur:
            sets = ", ".join(f"{k} = %s" for k in updates)
            values = list(updates.values()) + [id]
            cur.execute(f"UPDATE teacher_messages SET {sets} WHERE id = %s RETURNING *", values)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy lời nhắn")
            return row_to_dict(cur, row)


@router.delete("/teacher-messages/{id}", status_code=204)
def delete_teacher_message(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM teacher_messages WHERE id = %s RETURNING id", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy lời nhắn")
    return Response(status_code=204)
