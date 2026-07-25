from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional

from database import get_db, row_to_dict, rows_to_list

router = APIRouter(tags=["events"])


class EventInput(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    photo_url: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    photo_url: Optional[str] = None


@router.get("/events")
def list_events():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM events ORDER BY event_date ASC")
            return rows_to_list(cur, cur.fetchall())


@router.post("/events", status_code=201)
def create_event(data: EventInput):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO events (title, description, event_date, photo_url) VALUES (%s, %s, %s, %s) RETURNING *",
                (data.title, data.description, data.event_date, data.photo_url),
            )
            return row_to_dict(cur, cur.fetchone())


@router.put("/events/{id}")
def update_event(id: int, data: EventUpdate):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Không có trường nào để cập nhật")
    with get_db() as conn:
        with conn.cursor() as cur:
            sets = ", ".join(f"{k} = %s" for k in updates)
            values = list(updates.values()) + [id]
            cur.execute(f"UPDATE events SET {sets} WHERE id = %s RETURNING *", values)
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Không tìm thấy sự kiện")
            return row_to_dict(cur, row)


@router.delete("/events/{id}", status_code=204)
def delete_event(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM events WHERE id = %s RETURNING id", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy sự kiện")
    return Response(status_code=204)
