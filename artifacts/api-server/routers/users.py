from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db, row_to_dict
from auth import require_user, get_optional_user

router = APIRouter()


class UserSyncRequest(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    school_name: Optional[str] = None
    class_name: Optional[str] = None
    student_id: Optional[int] = None


@router.post("/auth/sync")
def sync_user(body: UserSyncRequest, clerk_user_id: str = Depends(require_user)):
    """Create or update user record on first login."""
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
        user = row_to_dict(cur, cur.fetchone())
    return user


@router.get("/auth/me")
def get_me(clerk_user_id: str = Depends(require_user)):
    """Get current user profile."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM app_users WHERE clerk_user_id = %s", (clerk_user_id,))
        user = row_to_dict(cur, cur.fetchone())
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Call /api/auth/sync first.")
    return user


@router.put("/auth/me")
def update_me(body: UserProfileUpdate, clerk_user_id: str = Depends(require_user)):
    """Update current user profile."""
    with get_db() as conn:
        cur = conn.cursor()
        fields = []
        vals = []
        if body.full_name is not None:
            fields.append("full_name = %s"); vals.append(body.full_name)
        if body.school_name is not None:
            fields.append("school_name = %s"); vals.append(body.school_name)
        if body.class_name is not None:
            fields.append("class_name = %s"); vals.append(body.class_name)
        if body.student_id is not None:
            # Verify student exists
            cur.execute("SELECT id FROM students WHERE id = %s", (body.student_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Student not found")
            fields.append("student_id = %s"); vals.append(body.student_id)
        if not fields:
            cur.execute("SELECT * FROM app_users WHERE clerk_user_id = %s", (clerk_user_id,))
            return row_to_dict(cur, cur.fetchone())
        fields.append("updated_at = NOW()")
        vals.append(clerk_user_id)
        cur.execute(
            f"UPDATE app_users SET {', '.join(fields)} WHERE clerk_user_id = %s RETURNING *",
            vals,
        )
        user = row_to_dict(cur, cur.fetchone())
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
