import base64, os, uuid
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, List
from database import get_db, row_to_dict, rows_to_list
from auth import require_user, get_optional_user

router = APIRouter()

# ── Admin password check ────────────────────────────────────────────────────
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin@kyYeu2024")

class AdminLoginRequest(BaseModel):
    password: str

@router.post("/admin/login")
def admin_login(body: AdminLoginRequest):
    if body.password == ADMIN_PASSWORD:
        # Simple token = base64 of password for demo
        token = base64.b64encode(body.password.encode()).decode()
        return {"ok": True, "token": token}
    raise HTTPException(status_code=401, detail="Sai mật khẩu quản trị")

@router.get("/admin/verify")
def admin_verify(token: str):
    try:
        pwd = base64.b64decode(token.encode()).decode()
        if pwd == ADMIN_PASSWORD:
            return {"ok": True}
    except Exception:
        pass
    raise HTTPException(status_code=401, detail="Token không hợp lệ")

# ── User sync ───────────────────────────────────────────────────────────────
class UserSyncRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None

@router.post("/auth/sync")
def sync_user(body: UserSyncRequest, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO app_users (clerk_user_id, email, full_name)
            VALUES (%s, %s, %s)
            ON CONFLICT (clerk_user_id) DO UPDATE
              SET email = COALESCE(EXCLUDED.email, app_users.email),
                  full_name = COALESCE(EXCLUDED.full_name, app_users.full_name),
                  updated_at = NOW()
            RETURNING *
        """, (clerk_user_id, body.email, body.full_name))
        return row_to_dict(cur, cur.fetchone())

@router.get("/auth/me")
def get_me(clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM app_users WHERE clerk_user_id = %s", (clerk_user_id,))
        user = row_to_dict(cur, cur.fetchone())
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Call /api/auth/sync first.")
    return user

# ── Profile update ──────────────────────────────────────────────────────────
# ── Role ────────────────────────────────────────────────────────────────────
class RoleUpdate(BaseModel):
    role: str  # "teacher" | "student" | "class_leader"

@router.put("/auth/me/role")
def set_role(body: RoleUpdate, clerk_user_id: str = Depends(require_user)):
    if body.role not in ("teacher", "student", "class_leader"):
        raise HTTPException(status_code=400, detail="role không hợp lệ")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE app_users SET role = %s, updated_at = NOW() WHERE clerk_user_id = %s RETURNING *",
            (body.role, clerk_user_id)
        )
        user = row_to_dict(cur, cur.fetchone())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    birth_date: Optional[str] = None
    phone: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    zalo: Optional[str] = None
    favorite_quote: Optional[str] = None
    personal_letter: Optional[str] = None
    school_name: Optional[str] = None
    class_name: Optional[str] = None
    student_id: Optional[int] = None

@router.put("/auth/me")
def update_me(body: UserProfileUpdate, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        updatable = ["full_name","nickname","birth_date","phone","facebook",
                     "instagram","zalo","favorite_quote","personal_letter",
                     "school_name","class_name"]
        fields, vals = [], []
        for col in updatable:
            val = getattr(body, col)
            if val is not None:
                fields.append(f"{col} = %s"); vals.append(val)
        if body.student_id is not None:
            cur.execute("SELECT id FROM students WHERE id = %s", (body.student_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Student not found")
            fields.append("student_id = %s"); vals.append(body.student_id)
        if not fields:
            cur.execute("SELECT * FROM app_users WHERE clerk_user_id = %s", (clerk_user_id,))
            return row_to_dict(cur, cur.fetchone())
        fields.append("updated_at = NOW()")
        vals.append(clerk_user_id)
        cur.execute(f"UPDATE app_users SET {', '.join(fields)} WHERE clerk_user_id = %s RETURNING *", vals)
        user = row_to_dict(cur, cur.fetchone())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ── Avatar upload (base64) ──────────────────────────────────────────────────
class AvatarUpload(BaseModel):
    data_url: str  # base64 data URL

@router.post("/auth/me/avatar")
def upload_avatar(body: AvatarUpload, clerk_user_id: str = Depends(require_user)):
    if not body.data_url.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Must be a base64 image data URL")
    if len(body.data_url) > 5_000_000:
        raise HTTPException(status_code=413, detail="Image too large (max ~3MB)")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE app_users SET photo_url = %s, updated_at = NOW() WHERE clerk_user_id = %s RETURNING photo_url",
            (body.data_url, clerk_user_id)
        )
        row = cur.fetchone()
    return {"photo_url": row[0] if row else None}

# ── Memory photos ───────────────────────────────────────────────────────────
class MemoryPhotosUpdate(BaseModel):
    photos: List[str]  # list of base64 data URLs or external URLs

@router.put("/auth/me/memory-photos")
def update_memory_photos(body: MemoryPhotosUpdate, clerk_user_id: str = Depends(require_user)):
    import json
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE app_users SET memory_photos = %s WHERE clerk_user_id = %s RETURNING memory_photos",
            (json.dumps(body.photos), clerk_user_id)
        )
        row = cur.fetchone()
    return {"photos": row[0] if row else []}

# ── Public profile ──────────────────────────────────────────────────────────
@router.get("/users/{clerk_user_id}/profile")
def get_public_profile(clerk_user_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT clerk_user_id, full_name, nickname, birth_date,
                   favorite_quote, personal_letter, photo_url, memory_photos,
                   school_name, class_name, plan, student_id, role, last_seen_at
            FROM app_users WHERE clerk_user_id = %s
        """, (clerk_user_id,))
        profile = row_to_dict(cur, cur.fetchone())
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile:
        from datetime import datetime, timezone
        seen = profile.get("last_seen_at")
        if isinstance(seen, str):
            try:
                seen = datetime.fromisoformat(seen.replace("Z", "+00:00"))
            except ValueError:
                seen = None
        profile["online"] = bool(
            seen
            and (datetime.now(timezone.utc) - seen).total_seconds() < 120
        )
    return profile

# ── Guestbook ───────────────────────────────────────────────────────────────
class GuestbookEntry(BaseModel):
    message: str
    author_name: Optional[str] = None

@router.get("/users/{clerk_user_id}/guestbook")
def get_guestbook(clerk_user_id: str):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT * FROM guestbook_entries
            WHERE target_clerk_id = %s
            ORDER BY created_at DESC
        """, (clerk_user_id,))
        return rows_to_list(cur, cur.fetchall())

@router.post("/users/{clerk_user_id}/guestbook")
def add_guestbook_entry(
    clerk_user_id: str,
    body: GuestbookEntry,
    author_id: Optional[str] = Depends(get_optional_user)
):
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    author_name = body.author_name or "Ẩn danh"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO guestbook_entries (target_clerk_id, author_clerk_id, author_name, message)
            VALUES (%s, %s, %s, %s) RETURNING *
        """, (clerk_user_id, author_id, author_name, body.message))
        return row_to_dict(cur, cur.fetchone())

@router.delete("/users/{clerk_user_id}/guestbook/{entry_id}")
def delete_guestbook_entry(
    clerk_user_id: str,
    entry_id: int,
    requester_id: str = Depends(require_user)
):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM guestbook_entries
            WHERE id = %s AND (target_clerk_id = %s OR author_clerk_id = %s)
            RETURNING id
        """, (entry_id, requester_id, requester_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Entry not found or unauthorized")
    return {"ok": True}
