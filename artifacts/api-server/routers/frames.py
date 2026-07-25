from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from database import get_db, row_to_dict, rows_to_list

router = APIRouter(tags=["frames"])


class FrameInput(BaseModel):
    name: str
    image_url: str
    description: Optional[str] = None
    is_free: bool = True
    price_label: Optional[str] = None


class UnlockFrameInput(BaseModel):
    student_id: int


@router.get("/frames")
def list_frames():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM frames ORDER BY is_free DESC, name ASC")
            return rows_to_list(cur, cur.fetchall())


@router.post("/frames", status_code=201)
def create_frame(data: FrameInput):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO frames (name, image_url, description, is_free, price_label)
                   VALUES (%s, %s, %s, %s, %s) RETURNING *""",
                (data.name, data.image_url, data.description, data.is_free, data.price_label),
            )
            return row_to_dict(cur, cur.fetchone())


@router.post("/frames/{id}/unlock")
def unlock_frame(id: int, data: UnlockFrameInput):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, is_free FROM frames WHERE id = %s", (id,))
            frame = cur.fetchone()
            if not frame:
                raise HTTPException(status_code=404, detail="Không tìm thấy khung ảnh")
            cur.execute("SELECT id FROM students WHERE id = %s", (data.student_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
            cur.execute(
                "SELECT 1 FROM student_unlocked_frames WHERE student_id = %s AND frame_id = %s",
                (data.student_id, id),
            )
            if cur.fetchone():
                return {"success": True, "message": "Khung ảnh đã được mở khóa trước đó"}
            cur.execute(
                "INSERT INTO student_unlocked_frames (student_id, frame_id) VALUES (%s, %s)",
                (data.student_id, id),
            )
            return {"success": True, "message": f"Đã mở khóa khung '{frame[1]}' thành công!"}
