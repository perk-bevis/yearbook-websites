from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Optional

from database import get_db, row_to_dict, rows_to_list

router = APIRouter(tags=["gallery"])


class PhotoInput(BaseModel):
    url: str
    caption: Optional[str] = None
    category: str = "other"
    uploaded_by: Optional[str] = None


@router.get("/gallery")
def list_photos(category: Optional[str] = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            if category:
                cur.execute(
                    "SELECT * FROM photos WHERE category = %s ORDER BY created_at DESC",
                    (category,),
                )
            else:
                cur.execute("SELECT * FROM photos ORDER BY created_at DESC")
            return rows_to_list(cur, cur.fetchall())


@router.post("/gallery", status_code=201)
def create_photo(data: PhotoInput):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO photos (url, caption, category, uploaded_by) VALUES (%s, %s, %s, %s) RETURNING *",
                (data.url, data.caption, data.category, data.uploaded_by),
            )
            return row_to_dict(cur, cur.fetchone())


@router.delete("/gallery/{id}", status_code=204)
def delete_photo(id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM photos WHERE id = %s RETURNING id", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    return Response(status_code=204)
