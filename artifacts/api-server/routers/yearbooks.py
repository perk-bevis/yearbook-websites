from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import re
from database import get_db, row_to_dict, rows_to_list
from auth import require_user, get_optional_user

router = APIRouter()


def make_slug(school: str, class_name: str, year: str) -> str:
    text = f"{class_name}-{school}-{year}"
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower().strip())
    return slug[:80]


class YearbookCreate(BaseModel):
    school_name: str
    class_name: str
    academic_year: str
    description: Optional[str] = None
    is_public: bool = True


@router.get("/yearbooks")
def list_yearbooks():
    """List all public yearbooks."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT y.*, COUNT(ym.id) AS member_count
            FROM yearbooks y
            LEFT JOIN yearbook_members ym ON ym.yearbook_id = y.id
            WHERE y.is_public = TRUE
            GROUP BY y.id
            ORDER BY y.created_at DESC
        """)
        return rows_to_list(cur, cur.fetchall())


@router.post("/yearbooks")
def create_yearbook(body: YearbookCreate, clerk_user_id: str = Depends(require_user)):
    """Create a new yearbook."""
    slug = make_slug(body.school_name, body.class_name, body.academic_year)
    with get_db() as conn:
        cur = conn.cursor()
        # Ensure unique slug
        cur.execute("SELECT id FROM yearbooks WHERE slug = %s", (slug,))
        if cur.fetchone():
            slug = slug + "-" + clerk_user_id[-4:]
        cur.execute("""
            INSERT INTO yearbooks (school_name, class_name, academic_year, description,
                                   owner_clerk_id, is_public, slug)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (body.school_name, body.class_name, body.academic_year,
              body.description, clerk_user_id, body.is_public, slug))
        yearbook = row_to_dict(cur, cur.fetchone())
        # Auto-join as owner
        cur.execute("""
            INSERT INTO yearbook_members (yearbook_id, clerk_user_id, role)
            VALUES (%s, %s, 'owner')
            ON CONFLICT DO NOTHING
        """, (yearbook["id"], clerk_user_id))
    return yearbook


@router.get("/yearbooks/mine")
def my_yearbooks(clerk_user_id: str = Depends(require_user)):
    """Get yearbooks the current user belongs to."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT y.* FROM yearbooks y
            JOIN yearbook_members ym ON ym.yearbook_id = y.id
            WHERE ym.clerk_user_id = %s
            ORDER BY y.created_at DESC
        """, (clerk_user_id,))
        return rows_to_list(cur, cur.fetchall())


@router.get("/yearbooks/{slug}")
def get_yearbook(slug: str, clerk_user_id: Optional[str] = Depends(get_optional_user)):
    """Get a yearbook by slug."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM yearbooks WHERE slug = %s", (slug,))
        yearbook = row_to_dict(cur, cur.fetchone())
    if not yearbook:
        raise HTTPException(status_code=404, detail="Yearbook not found")
    if not yearbook["is_public"] and yearbook["owner_clerk_id"] != clerk_user_id:
        raise HTTPException(status_code=403, detail="This yearbook is private")
    return yearbook


@router.post("/yearbooks/{yearbook_id}/join")
def join_yearbook(yearbook_id: int, clerk_user_id: str = Depends(require_user)):
    """Join a yearbook as member."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM yearbooks WHERE id = %s AND is_public = TRUE", (yearbook_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Yearbook not found or private")
        cur.execute("""
            INSERT INTO yearbook_members (yearbook_id, clerk_user_id, role)
            VALUES (%s, %s, 'member')
            ON CONFLICT (yearbook_id, clerk_user_id) DO NOTHING
        """, (yearbook_id, clerk_user_id))
    return {"ok": True}
