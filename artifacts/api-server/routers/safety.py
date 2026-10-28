"""Block and report users. Reports are reviewed by teachers / class admins."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import require_user, require_roles
from database import get_db, rows_to_list

router = APIRouter(tags=["safety"])

REPORT_REASONS = ("spam", "harassment", "inappropriate", "impersonation", "other")


@router.get("/blocks")
def list_blocks(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT b.blocked_id AS user_id, au.full_name, au.nickname, au.photo_url, b.created_at
               FROM user_blocks b LEFT JOIN app_users au ON au.clerk_user_id = b.blocked_id
               WHERE b.blocker_id = %s ORDER BY b.created_at DESC""",
            (user_id,),
        )
        return rows_to_list(cur, cur.fetchall())


@router.post("/users/{target_id}/block", status_code=201)
def block_user(target_id: str, user_id: str = Depends(require_user)):
    if target_id == user_id:
        raise HTTPException(status_code=400, detail="Không thể tự chặn chính mình")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM app_users WHERE clerk_user_id = %s", (target_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        cur.execute(
            "INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, target_id),
        )
        # Blocking ends any friendship between the two.
        cur.execute(
            "DELETE FROM friendships WHERE user_a = LEAST(%s, %s) AND user_b = GREATEST(%s, %s)",
            (user_id, target_id, user_id, target_id),
        )
    return {"status": "blocked"}


@router.delete("/users/{target_id}/block", status_code=204)
def unblock_user(target_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_blocks WHERE blocker_id = %s AND blocked_id = %s", (user_id, target_id))


class ReportBody(BaseModel):
    reported_id: str = Field(min_length=1, max_length=255)
    reason: str
    details: str = Field(default="", max_length=2000)


@router.post("/reports", status_code=201)
def create_report(body: ReportBody, user_id: str = Depends(require_user)):
    if body.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Lý do báo cáo không hợp lệ")
    if body.reported_id == user_id:
        raise HTTPException(status_code=400, detail="Không thể tự báo cáo chính mình")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM app_users WHERE clerk_user_id = %s", (body.reported_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        # Cap open reports per reporter/target pair to stop report spam.
        cur.execute(
            "SELECT COUNT(*) FROM user_reports WHERE reporter_id = %s AND reported_id = %s AND status = 'open'",
            (user_id, body.reported_id),
        )
        if cur.fetchone()[0] >= 3:
            raise HTTPException(status_code=429, detail="Bạn đã báo cáo người này, quản trị viên sẽ xem xét")
        cur.execute(
            "INSERT INTO user_reports (reporter_id, reported_id, reason, details) VALUES (%s, %s, %s, %s) RETURNING id",
            (user_id, body.reported_id, body.reason, body.details.strip()),
        )
        return {"id": cur.fetchone()[0], "status": "open"}


@router.get("/admin/reports")
def list_reports(status: str = "open", _staff: str = Depends(require_roles("teacher", "class_admin"))):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT r.id, r.reason, r.details, r.status, r.created_at,
                      r.reporter_id, rp.full_name AS reporter_name,
                      r.reported_id, rd.full_name AS reported_name
               FROM user_reports r
               LEFT JOIN app_users rp ON rp.clerk_user_id = r.reporter_id
               LEFT JOIN app_users rd ON rd.clerk_user_id = r.reported_id
               WHERE r.status = %s ORDER BY r.created_at DESC LIMIT 200""",
            (status,),
        )
        return rows_to_list(cur, cur.fetchall())


class ReportDecision(BaseModel):
    status: str  # resolved | dismissed


@router.post("/admin/reports/{report_id}")
def resolve_report(report_id: int, body: ReportDecision, _staff: str = Depends(require_roles("teacher", "class_admin"))):
    if body.status not in ("resolved", "dismissed"):
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE user_reports SET status = %s WHERE id = %s RETURNING id", (body.status, report_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")
    return {"status": body.status}
