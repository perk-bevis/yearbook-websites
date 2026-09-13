from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db, row_to_dict, rows_to_list
from auth import require_user, get_optional_user

router = APIRouter(tags=["feed"])


class CreatePostRequest(BaseModel):
    content: str
    image_url: Optional[str] = None  # base64 data URL or external URL
    author_name: str
    author_photo: Optional[str] = None


class CreateCommentRequest(BaseModel):
    content: str
    author_name: str
    author_photo: Optional[str] = None


class UpdatePostRequest(BaseModel):
    content: str
    image_url: Optional[str] = None


def ensure_feed_schema():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE")
        cur.execute("ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feed_saved_posts (
                id SERIAL PRIMARY KEY,
                post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
                clerk_user_id TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(post_id, clerk_user_id)
            )
        """)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feed_shares (
                id SERIAL PRIMARY KEY,
                post_id INTEGER NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
                clerk_user_id TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(post_id, clerk_user_id)
            )
        """)


ensure_feed_schema()


def _can_manage_post(cur, post_id: int, clerk_user_id: str) -> bool:
    cur.execute("""
        SELECT p.clerk_user_id, COALESCE(u.role, 'student')
        FROM feed_posts p
        LEFT JOIN app_users u ON u.clerk_user_id = %s
        WHERE p.id = %s
    """, (clerk_user_id, post_id))
    row = cur.fetchone()
    return bool(row and (row[0] == clerk_user_id or row[1] == "class_leader"))


@router.get("/feed/posts")
def list_posts(
    limit: int = 20,
    offset: int = 0,
    clerk_user_id: Optional[str] = Depends(get_optional_user),
):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT p.*,
                   (SELECT COUNT(*) FROM feed_likes WHERE post_id = p.id) AS likes_count,
                   (SELECT COUNT(*) FROM feed_comments WHERE post_id = p.id) AS comments_count,
                   (SELECT COUNT(*) FROM feed_shares WHERE post_id = p.id) AS shares_count,
                   EXISTS(
                     SELECT 1 FROM feed_saved_posts s
                     WHERE s.post_id = p.id AND s.clerk_user_id = %s
                   ) AS saved
            FROM feed_posts p
            ORDER BY p.is_pinned DESC, p.created_at DESC
            LIMIT %s OFFSET %s
        """, (clerk_user_id or "", limit, offset))
        return rows_to_list(cur, cur.fetchall())


@router.post("/feed/posts", status_code=201)
def create_post(body: CreatePostRequest, clerk_user_id: str = Depends(require_user)):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO feed_posts (clerk_user_id, author_name, author_photo, content, image_url)
            VALUES (%s, %s, %s, %s, %s) RETURNING *
        """, (clerk_user_id, body.author_name, body.author_photo, body.content.strip(), body.image_url))
        post = row_to_dict(cur, cur.fetchone())
    post["likes_count"] = 0
    post["comments_count"] = 0
    return post


@router.delete("/feed/posts/{post_id}")
def delete_post(post_id: int, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        if not _can_manage_post(cur, post_id, clerk_user_id):
            raise HTTPException(status_code=404, detail="Post not found or unauthorized")
        cur.execute("DELETE FROM feed_posts WHERE id = %s RETURNING id", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


@router.patch("/feed/posts/{post_id}")
def update_post(
    post_id: int,
    body: UpdatePostRequest,
    clerk_user_id: str = Depends(require_user),
):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    with get_db() as conn:
        cur = conn.cursor()
        if not _can_manage_post(cur, post_id, clerk_user_id):
            raise HTTPException(status_code=404, detail="Post not found or unauthorized")
        cur.execute("""
            UPDATE feed_posts
            SET content = %s, image_url = %s, edited_at = NOW()
            WHERE id = %s
            RETURNING *
        """, (body.content.strip(), body.image_url, post_id))
        post = row_to_dict(cur, cur.fetchone())
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post["likes_count"] = 0
    post["comments_count"] = 0
    post["shares_count"] = 0
    post["saved"] = False
    return post


@router.post("/feed/posts/{post_id}/pin")
def toggle_pin(post_id: int, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        if not _can_manage_post(cur, post_id, clerk_user_id):
            raise HTTPException(status_code=404, detail="Post not found or unauthorized")
        cur.execute("""
            UPDATE feed_posts SET is_pinned = NOT is_pinned
            WHERE id = %s RETURNING is_pinned
        """, (post_id,))
        row = cur.fetchone()
    return {"is_pinned": bool(row[0])}


@router.post("/feed/posts/{post_id}/save")
def toggle_save(post_id: int, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM feed_posts WHERE id = %s", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
        cur.execute(
            "SELECT id FROM feed_saved_posts WHERE post_id = %s AND clerk_user_id = %s",
            (post_id, clerk_user_id),
        )
        saved_row = cur.fetchone()
        if saved_row:
            cur.execute("DELETE FROM feed_saved_posts WHERE id = %s", (saved_row[0],))
            saved = False
        else:
            cur.execute(
                "INSERT INTO feed_saved_posts (post_id, clerk_user_id) VALUES (%s, %s)",
                (post_id, clerk_user_id),
            )
            saved = True
    return {"saved": saved}


@router.get("/feed/saved")
def list_saved_posts(clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT p.*,
              (SELECT COUNT(*) FROM feed_likes WHERE post_id = p.id) AS likes_count,
              (SELECT COUNT(*) FROM feed_comments WHERE post_id = p.id) AS comments_count,
              (SELECT COUNT(*) FROM feed_shares WHERE post_id = p.id) AS shares_count,
              TRUE AS saved
            FROM feed_posts p
            JOIN feed_saved_posts s ON s.post_id = p.id
            WHERE s.clerk_user_id = %s
            ORDER BY s.created_at DESC
        """, (clerk_user_id,))
        return rows_to_list(cur, cur.fetchall())


@router.post("/feed/posts/{post_id}/share")
def share_post(post_id: int, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM feed_posts WHERE id = %s", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
        cur.execute("""
            INSERT INTO feed_shares (post_id, clerk_user_id)
            VALUES (%s, %s)
            ON CONFLICT (post_id, clerk_user_id) DO NOTHING
        """, (post_id, clerk_user_id))
        cur.execute("SELECT COUNT(*) FROM feed_shares WHERE post_id = %s", (post_id,))
        shares_count = cur.fetchone()[0]
    return {"shares_count": shares_count}


@router.post("/feed/posts/{post_id}/like")
def toggle_like(post_id: int, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM feed_likes WHERE post_id = %s AND clerk_user_id = %s", (post_id, clerk_user_id))
        if cur.fetchone():
            cur.execute("DELETE FROM feed_likes WHERE post_id = %s AND clerk_user_id = %s", (post_id, clerk_user_id))
            liked = False
        else:
            cur.execute("INSERT INTO feed_likes (post_id, clerk_user_id) VALUES (%s, %s)", (post_id, clerk_user_id))
            liked = True
        cur.execute("SELECT COUNT(*) FROM feed_likes WHERE post_id = %s", (post_id,))
        count = cur.fetchone()[0]
    return {"liked": liked, "likes_count": count}


@router.get("/feed/posts/{post_id}/likes")
def get_post_likes(post_id: int, clerk_user_id: Optional[str] = Depends(get_optional_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM feed_likes WHERE post_id = %s", (post_id,))
        count = cur.fetchone()[0]
        liked = False
        if clerk_user_id:
            cur.execute("SELECT 1 FROM feed_likes WHERE post_id = %s AND clerk_user_id = %s", (post_id, clerk_user_id))
            liked = cur.fetchone() is not None
    return {"likes_count": count, "liked": liked}


@router.get("/feed/posts/{post_id}/comments")
def get_comments(post_id: int):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM feed_comments WHERE post_id = %s ORDER BY created_at ASC", (post_id,))
        return rows_to_list(cur, cur.fetchall())


@router.post("/feed/posts/{post_id}/comments", status_code=201)
def add_comment(post_id: int, body: CreateCommentRequest, clerk_user_id: str = Depends(require_user)):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id FROM feed_posts WHERE id = %s", (post_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Post not found")
        cur.execute("""
            INSERT INTO feed_comments (post_id, clerk_user_id, author_name, author_photo, content)
            VALUES (%s, %s, %s, %s, %s) RETURNING *
        """, (post_id, clerk_user_id, body.author_name, body.author_photo, body.content.strip()))
        return row_to_dict(cur, cur.fetchone())


@router.delete("/feed/comments/{comment_id}")
def delete_comment(comment_id: int, clerk_user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            DELETE FROM feed_comments WHERE id = %s AND clerk_user_id = %s RETURNING id
        """, (comment_id, clerk_user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Comment not found or unauthorized")
    return {"ok": True}
