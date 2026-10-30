
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from database import get_db, row_to_dict, rows_to_list

router = APIRouter(tags=["events"])


class EventInput(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = None
    event_date: datetime
    location: Optional[str] = None
    photo_url: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[datetime] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None


@router.get("/events")
def list_events():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM events ORDER BY event_date ASC")
            return rows_to_list(cur, cur.fetchall())


@router.post("/events", status_code=201)
def create_event(data: EventInput):
    title = data.title.strip()
    if not title:
        raise HTTPException(422, "Tên sự kiện không được để trống")

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO events
                    (title, description, event_date, location, photo_url)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    title,
                    data.description,
                    data.event_date,
                    data.location,
                    data.photo_url,
                ),
            )
            return row_to_dict(cur, cur.fetchone())


@router.put("/events/{id}")
def update_event(id: int, data: EventUpdate):
    updates = data.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(400, "Không có trường nào để cập nhật")

    allowed = {"title", "description", "event_date", "location", "photo_url"}
    updates = {k: v for k, v in updates.items() if k in allowed}

    if "title" in updates and updates["title"] is not None:
        updates["title"] = updates["title"].strip()
        if not updates["title"]:
            raise HTTPException(422, "Tên sự kiện không được để trống")

    with get_db() as conn:
        with conn.cursor() as cur:
            sets = ", ".join(f"{k} = %s" for k in updates)
            values = list(updates.values()) + [id]
            cur.execute(
                f"UPDATE events SET {sets} WHERE id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(404, "Không tìm thấy sự kiện")
            return row_to_dict(cur, row)


@router.delete("/events/{id}", status_code=204)
def delete_event(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM events WHERE id = %s RETURNING id",
                (id,),
            )
            if not cur.fetchone():
                raise HTTPException(404, "Không tìm thấy sự kiện")
    return Response(status_code=204)
