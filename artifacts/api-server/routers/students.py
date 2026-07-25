from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional

from database import get_db, row_to_dict, rows_to_list

router = APIRouter(tags=["students"])


class StudentInput(BaseModel):
    name: str
    nickname: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[str] = None
    hobbies: Optional[str] = None
    dream: Optional[str] = None
    message: Optional[str] = None
    role: Optional[str] = "student"


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    photo_url: Optional[str] = None
    birth_date: Optional[str] = None
    hobbies: Optional[str] = None
    dream: Optional[str] = None
    message: Optional[str] = None
    role: Optional[str] = None


class StudentFrameInput(BaseModel):
    frame_id: Optional[int] = None


@router.get("/students")
def list_students():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT * FROM students
                   ORDER BY
                     CASE role
                       WHEN 'monitor' THEN 1
                       WHEN 'vice_monitor' THEN 2
                       ELSE 3
                     END,
                     name ASC"""
            )
            return rows_to_list(cur, cur.fetchall())


@router.post("/students", status_code=201)
def create_student(data: StudentInput):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO students (name, nickname, photo_url, birth_date, hobbies, dream, message, role)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
                (
                    data.name,
                    data.nickname,
                    data.photo_url,
                    data.birth_date,
                    data.hobbies,
                    data.dream,
                    data.message,
                    data.role or "student",
                ),
            )
            return row_to_dict(cur, cur.fetchone())


@router.get("/students/{id}")
def get_student(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM students WHERE id = %s", (id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
            return row_to_dict(cur, row)


@router.put("/students/{id}")
def update_student(id: int, data: StudentUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
    with get_db() as conn:
        with conn.cursor() as cur:
            sets = ", ".join(f"{k} = %s" for k in updates)
            values = list(updates.values()) + [id]
            cur.execute(f"UPDATE students SET {sets} WHERE id = %s RETURNING *", values)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
            return row_to_dict(cur, row)


@router.delete("/students/{id}", status_code=204)
def delete_student(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM students WHERE id = %s RETURNING id", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
    return Response(status_code=204)


@router.get("/students/{id}/frame")
def get_student_active_frame(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT active_frame_id FROM students WHERE id = %s", (id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
            frame_id = row[0]
            if not frame_id:
                raise HTTPException(status_code=404, detail="Chưa chọn khung ảnh")
            cur.execute("SELECT * FROM frames WHERE id = %s", (frame_id,))
            frame = cur.fetchone()
            if not frame:
                raise HTTPException(status_code=404, detail="Không tìm thấy khung ảnh")
            return row_to_dict(cur, frame)


@router.put("/students/{id}/frame")
def set_student_frame(id: int, data: StudentFrameInput):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM students WHERE id = %s", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy học sinh")
            if data.frame_id is not None:
                cur.execute("SELECT is_free FROM frames WHERE id = %s", (data.frame_id,))
                frame = cur.fetchone()
                if not frame:
                    raise HTTPException(status_code=404, detail="Không tìm thấy khung ảnh")
                if not frame[0]:
                    cur.execute(
                        "SELECT 1 FROM student_unlocked_frames WHERE student_id = %s AND frame_id = %s",
                        (id, data.frame_id),
                    )
                    if not cur.fetchone():
                        raise HTTPException(
                            status_code=403, detail="Khung ảnh chưa được mở khóa"
                        )
            cur.execute(
                "UPDATE students SET active_frame_id = %s WHERE id = %s RETURNING *",
                (data.frame_id, id),
            )
            return row_to_dict(cur, cur.fetchone())
