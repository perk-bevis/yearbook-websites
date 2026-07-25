from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional

from database import get_db, row_to_dict, rows_to_list

router = APIRouter(tags=["memories"])


class MemoryInput(BaseModel):
    title: str
    content: str
    photo_url: Optional[str] = None
    author: str


class MemoryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    photo_url: Optional[str] = None
    author: Optional[str] = None


@router.get("/memories")
def list_memories():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM memories ORDER BY created_at DESC")
            return rows_to_list(cur, cur.fetchall())


@router.post("/memories", status_code=201)
def create_memory(data: MemoryInput):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO memories (title, content, photo_url, author) VALUES (%s, %s, %s, %s) RETURNING *",
                (data.title, data.content, data.photo_url, data.author),
            )
            return row_to_dict(cur, cur.fetchone())


@router.get("/memories/{id}")
def get_memory(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM memories WHERE id = %s", (id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy kỷ niệm")
            return row_to_dict(cur, row)


@router.put("/memories/{id}")
def update_memory(id: int, data: MemoryUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
    with get_db() as conn:
        with conn.cursor() as cur:
            sets = ", ".join(f"{k} = %s" for k in updates)
            values = list(updates.values()) + [id]
            cur.execute(f"UPDATE memories SET {sets} WHERE id = %s RETURNING *", values)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy kỷ niệm")
            return row_to_dict(cur, row)


@router.delete("/memories/{id}", status_code=204)
def delete_memory(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM memories WHERE id = %s RETURNING id", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy kỷ niệm")
    return Response(status_code=204)
