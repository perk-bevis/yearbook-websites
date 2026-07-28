from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db, row_to_dict, rows_to_list
from auth import require_user

router = APIRouter(tags=["messages"])


class SendMessageRequest(BaseModel):
    receiver_id: str
    content: str


@router.post("/messages/send", status_code=201)
def send_message(body: SendMessageRequest, sender_id: str = Depends(require_user)):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được trống")
    if body.receiver_id == sender_id:
        raise HTTPException(status_code=400, detail="Không thể nhắn tin cho chính mình")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (%s, %s, %s) RETURNING *",
            (sender_id, body.receiver_id, body.content.strip()),
        )
        return row_to_dict(cur, cur.fetchone())


@router.get("/messages/conversations")
def list_conversations(user_id: str = Depends(require_user)):
    """Return list of unique conversation partners with last message + unread count."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            WITH partners AS (
                SELECT DISTINCT
                    CASE WHEN sender_id = %s THEN receiver_id ELSE sender_id END AS partner_id
                FROM direct_messages
                WHERE sender_id = %s OR receiver_id = %s
            ),
            last_msgs AS (
                SELECT
                    p.partner_id,
                    (SELECT content FROM direct_messages
                     WHERE (sender_id = %s AND receiver_id = p.partner_id)
                        OR (sender_id = p.partner_id AND receiver_id = %s)
                     ORDER BY created_at DESC LIMIT 1) AS last_message,
                    (SELECT created_at FROM direct_messages
                     WHERE (sender_id = %s AND receiver_id = p.partner_id)
                        OR (sender_id = p.partner_id AND receiver_id = %s)
                     ORDER BY created_at DESC LIMIT 1) AS last_at,
                    (SELECT COUNT(*) FROM direct_messages
                     WHERE sender_id = p.partner_id AND receiver_id = %s AND is_read = FALSE
                    ) AS unread_count
                FROM partners p
            )
            SELECT
                lm.partner_id,
                lm.last_message,
                lm.last_at,
                lm.unread_count,
                au.full_name,
                au.nickname,
                au.photo_url,
                au.role
            FROM last_msgs lm
            LEFT JOIN app_users au ON au.clerk_user_id = lm.partner_id
            ORDER BY lm.last_at DESC
        """, (user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id))
        return rows_to_list(cur, cur.fetchall())


@router.get("/messages/thread/{other_user_id}")
def get_thread(other_user_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        # Mark messages from other_user_id to user_id as read
        cur.execute(
            "UPDATE direct_messages SET is_read = TRUE WHERE sender_id = %s AND receiver_id = %s",
            (other_user_id, user_id),
        )
        cur.execute("""
            SELECT dm.*, 
                   au.full_name, au.nickname, au.photo_url
            FROM direct_messages dm
            LEFT JOIN app_users au ON au.clerk_user_id = dm.sender_id
            WHERE (dm.sender_id = %s AND dm.receiver_id = %s)
               OR (dm.sender_id = %s AND dm.receiver_id = %s)
            ORDER BY dm.created_at ASC
        """, (user_id, other_user_id, other_user_id, user_id))
        return rows_to_list(cur, cur.fetchall())


@router.get("/messages/unread-count")
def unread_count(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) as count FROM direct_messages WHERE receiver_id = %s AND is_read = FALSE",
            (user_id,),
        )
        row = cur.fetchone()
        return {"count": row[0] if row else 0}


@router.get("/users/list")
def list_users(user_id: str = Depends(require_user)):
    """Return all users except the current one (for starting new conversations)."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT clerk_user_id, full_name, nickname, photo_url, role
            FROM app_users
            WHERE clerk_user_id != %s
            ORDER BY full_name ASC
        """, (user_id,))
        return rows_to_list(cur, cur.fetchall())
