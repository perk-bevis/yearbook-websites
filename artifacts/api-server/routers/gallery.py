import base64
import os

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from typing import Optional

from database import get_db, row_to_dict, rows_to_list
from auth import get_optional_user, require_user
from object_storage import create_upload

router = APIRouter(tags=["gallery"])


class PhotoInput(BaseModel):
    url: str
    caption: Optional[str] = None
    category: str = "other"
    uploaded_by: Optional[str] = None
    admin_token: Optional[str] = None


def _valid_admin_token(token: Optional[str]) -> bool:
    if not token:
        return False
    try:
        password = base64.b64decode(token.encode()).decode()
    except Exception:
        return False
    return password == os.environ.get("ADMIN_PASSWORD", "admin@kyYeu2024")


def _is_class_leader(user_id: Optional[str]) -> bool:
    if not user_id:
        return False
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT role FROM app_users WHERE clerk_user_id = %s", (user_id,))
        row = cur.fetchone()
    return bool(row and row[0] in ("class_leader", "teacher"))


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


@router.post("/storage/uploads/request-url")
def request_storage_upload_url(clerk_user_id: str = Depends(require_user)):
    if not _is_class_leader(clerk_user_id):
        raise HTTPException(status_code=403, detail="Chỉ lớp trưởng mới được thêm ảnh vào album")
    upload_url, object_path = create_upload()
    return {"uploadURL": upload_url, "objectPath": object_path}


@router.post("/gallery", status_code=201)
def create_photo(
    data: PhotoInput,
    clerk_user_id: Optional[str] = Depends(get_optional_user),
):
    if not clerk_user_id and not _valid_admin_token(data.admin_token):
        raise HTTPException(status_code=401, detail="Bạn cần đăng nhập")
    if clerk_user_id and not _is_class_leader(clerk_user_id):
        raise HTTPException(status_code=403, detail="Chỉ lớp trưởng mới được thêm ảnh vào album")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO photos (url, caption, category, uploaded_by) VALUES (%s, %s, %s, %s) RETURNING *",
                (data.url, data.caption, data.category, clerk_user_id or data.uploaded_by or "admin"),
            )
            return row_to_dict(cur, cur.fetchone())


@router.delete("/gallery/{id}", status_code=204)
def delete_photo(
    id: int,
    admin_token: Optional[str] = Query(None),
    clerk_user_id: Optional[str] = Depends(get_optional_user),
):
    if not clerk_user_id and not _valid_admin_token(admin_token):
        raise HTTPException(status_code=401, detail="Bạn cần đăng nhập")
    if clerk_user_id and not _is_class_leader(clerk_user_id):
        raise HTTPException(status_code=403, detail="Chỉ lớp trưởng mới được quản lý album")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM photos WHERE id = %s RETURNING id", (id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Không tìm thấy ảnh")
    return Response(status_code=204)
