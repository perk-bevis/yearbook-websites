import base64
import os
import re
from typing import Optional

import requests
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from pydantic import BaseModel

from auth import get_optional_user, require_user
from database import get_db, row_to_dict, rows_to_list
from object_storage import create_upload


router = APIRouter(tags=["gallery"])

# Giới hạn dung lượng ảnh: 10 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024

# Các định dạng ảnh được chấp nhận
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
}


def validate_image(data: bytes, content_type: str) -> None:
    """Kiểm tra chữ ký file ảnh, không chỉ dựa vào MIME type."""

    signatures = {
        "image/jpeg": data.startswith(b"\xff\xd8\xff"),
        "image/png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": data.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": (
            len(data) >= 12
            and data.startswith(b"RIFF")
            and data[8:12] == b"WEBP"
        ),
    }

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Chỉ chấp nhận ảnh JPEG, PNG, GIF hoặc WebP",
        )

    if not signatures.get(content_type, False):
        raise HTTPException(
            status_code=415,
            detail="Nội dung tệp không đúng định dạng ảnh",
        )


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

    return password == os.environ.get(
        "ADMIN_PASSWORD",
        "admin@kyYeu2024",
    )


def _can_manage_gallery(user_id: Optional[str]) -> bool:
    if not user_id:
        return False

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT role
                FROM app_users
                WHERE clerk_user_id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()

    return bool(row and row[0] == "teacher")


# =========================================================
# UPLOAD ẢNH
# Frontend gửi multipart/form-data với field tên "file".
# Chỉ người dùng đã đăng nhập mới được upload.
# =========================================================

@router.post("/storage/uploads", status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    clerk_user_id: str = Depends(require_user),
):
    """Nhận ảnh, kiểm tra và tải lên object storage."""

    content_type = (file.content_type or "").lower()

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Chỉ chấp nhận ảnh JPEG, PNG, GIF hoặc WebP",
        )

    try:
        # Chỉ đọc tối đa 10 MB + 1 byte để phát hiện file quá lớn.
        data = await file.read(MAX_IMAGE_SIZE + 1)
    finally:
        await file.close()

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Tệp ảnh đang trống",
        )

    if len(data) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ảnh không được vượt quá 10 MB",
        )

    validate_image(data, content_type)

    # Tạo URL upload và đường dẫn object bằng hệ thống hiện có.
    upload_url, object_path = create_upload()

    try:
        response = requests.put(
            upload_url,
            data=data,
            headers={"Content-Type": content_type},
            timeout=60,
        )
        response.raise_for_status()
    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Không thể lưu ảnh, vui lòng thử lại",
        )

    return {
        "url": object_path,
        "objectPath": object_path,
        "contentType": content_type,
        "size": len(data),
    }


# =========================================================
# ALBUM ẢNH
# =========================================================

@router.get("/gallery")
def list_photos(category: Optional[str] = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            if category:
                cur.execute(
                    """
                    SELECT *
                    FROM photos
                    WHERE category = %s
                    ORDER BY created_at DESC
                    """,
                    (category,),
                )
            else:
                cur.execute(
                    """
                    SELECT *
                    FROM photos
                    ORDER BY created_at DESC
                    """
                )

            return rows_to_list(cur, cur.fetchall())


# API cũ: giữ lại để không làm hỏng frontend album hiện tại.
@router.post("/storage/uploads/request-url")
def request_storage_upload_url(
    clerk_user_id: str = Depends(require_user),
):
    if not _can_manage_gallery(clerk_user_id):
        raise HTTPException(
            status_code=403,
            detail="Chỉ giáo viên phụ trách lớp mới được thêm ảnh vào album",
        )

    upload_url, object_path = create_upload()

    return {
        "uploadURL": upload_url,
        "objectPath": object_path,
    }


@router.post("/gallery", status_code=201)
def create_photo(
    data: PhotoInput,
    clerk_user_id: Optional[str] = Depends(get_optional_user),
):
    if not clerk_user_id and not _valid_admin_token(data.admin_token):
        raise HTTPException(
            status_code=401,
            detail="Bạn cần đăng nhập",
        )

    if clerk_user_id and not _can_manage_gallery(clerk_user_id):
        raise HTTPException(
            status_code=403,
            detail="Chỉ giáo viên phụ trách lớp mới được thêm ảnh vào album",
        )

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO photos
                    (url, caption, category, uploaded_by)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (
                    data.url,
                    data.caption,
                    data.category,
                    clerk_user_id or data.uploaded_by or "admin",
                ),
            )

            return row_to_dict(cur, cur.fetchone())


@router.delete("/gallery/{id}", status_code=204)
def delete_photo(
    id: int,
    admin_token: Optional[str] = Query(None),
    clerk_user_id: Optional[str] = Depends(get_optional_user),
):
    if not clerk_user_id and not _valid_admin_token(admin_token):
        raise HTTPException(
            status_code=401,
            detail="Bạn cần đăng nhập",
        )

    if clerk_user_id and not _can_manage_gallery(clerk_user_id):
        raise HTTPException(
            status_code=403,
            detail="Chỉ giáo viên phụ trách lớp mới được quản lý album",
        )

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM photos WHERE id = %s RETURNING id",
                (id,),
            )

            if not cur.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Không tìm thấy ảnh",
                )

    return Response(status_code=204)
