import os
import uuid
from datetime import datetime, timezone
from urllib.parse import unquote

import requests
from fastapi import HTTPException

SIDECAR_ENDPOINT = "http://127.0.0.1:1106"


def _object_parts(object_name: str) -> tuple[str, str]:
    private_dir = os.environ.get("PRIVATE_OBJECT_DIR", "").strip().strip("/")
    if not private_dir:
        raise HTTPException(status_code=500, detail="Object storage is not configured")
    parts = private_dir.split("/", 1)
    bucket = parts[0]
    prefix = parts[1] if len(parts) > 1 else ""
    return bucket, f"{prefix}/{object_name}".strip("/")


def signed_object_url(method: str, object_name: str, ttl_seconds: int = 900) -> str:
    bucket, full_name = _object_parts(object_name)
    response = requests.post(
        f"{SIDECAR_ENDPOINT}/object-storage/signed-object-url",
        json={
            "bucket_name": bucket,
            "object_name": full_name,
            "method": method,
            "expires_at": datetime.fromtimestamp(
                datetime.now(timezone.utc).timestamp() + ttl_seconds,
                timezone.utc,
            ).isoformat(),
        },
        timeout=30,
    )
    if not response.ok:
        raise HTTPException(status_code=502, detail="Không thể tạo URL lưu ảnh")
    return response.json()["signed_url"]


def create_upload() -> tuple[str, str]:
    object_name = f"uploads/{uuid.uuid4()}"
    upload_url = signed_object_url("PUT", object_name)
    return upload_url, f"/api/storage/objects/{object_name}"


def object_name_from_path(path: str) -> str:
    return unquote(path).lstrip("/")