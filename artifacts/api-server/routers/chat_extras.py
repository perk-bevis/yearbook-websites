"""Message actions on the current chat tables: recall/delete, react, search."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import require_user, get_role_info
from database import get_db, rows_to_list

router = APIRouter(tags=["chat"])

ATTACHMENT_PREFIX = "YB_ATTACHMENT:"


def _is_staff(user_id: str) -> bool:
    info = get_role_info(user_id)
    return bool(info and info[1] == "approved" and info[0] in ("teacher", "class_admin", "super_admin"))


def _in_group(cur, group_id: int, user_id: str) -> bool:
    cur.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s AND status = 'joined'", (group_id, user_id))
    return cur.fetchone() is not None


# ── Recall / delete ─────────────────────────────────────────────────────────
@router.delete("/messages/dm/{message_id}")
def recall_direct_message(message_id: int, user_id: str = Depends(require_user)):
    """Only the sender can recall a private message."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """UPDATE direct_messages SET deleted_at = NOW(), deleted_by = %s
               WHERE id = %s AND sender_id = %s AND deleted_at IS NULL RETURNING id""",
            (user_id, message_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn của bạn")
    return {"status": "recalled"}


@router.delete("/groups/{group_id}/messages/{message_id}")
def delete_group_message(group_id: int, message_id: int, user_id: str = Depends(require_user)):
    """The sender can recall their own message; approved teachers can remove any message."""
    with get_db() as conn:
        cur = conn.cursor()
        if not _in_group(cur, group_id, user_id):
            raise HTTPException(status_code=403, detail="Bạn không ở trong nhóm này")
        cur.execute("SELECT sender_id, deleted_at FROM group_messages WHERE id = %s AND group_id = %s", (message_id, group_id))
        row = cur.fetchone()
        if not row or row[1] is not None:
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn")
        if row[0] != user_id and not _is_staff(user_id):
            raise HTTPException(status_code=403, detail="Chỉ giáo viên mới được xóa tin của người khác")
        cur.execute("UPDATE group_messages SET deleted_at = NOW(), deleted_by = %s WHERE id = %s", (user_id, message_id))
    return {"status": "deleted"}


# ── Reactions ───────────────────────────────────────────────────────────────
ALLOWED_EMOJI = ("👍", "❤️", "😂", "😮", "😢", "🙏")


class ReactionBody(BaseModel):
    emoji: str = Field(min_length=1, max_length=16)


def _check_emoji(emoji: str):
    if emoji not in ALLOWED_EMOJI:
        raise HTTPException(status_code=400, detail="Cảm xúc không được hỗ trợ")


@router.post("/messages/dm/{message_id}/reactions", status_code=201)
def react_direct(message_id: int, body: ReactionBody, user_id: str = Depends(require_user)):
    _check_emoji(body.emoji)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM direct_messages WHERE id = %s AND deleted_at IS NULL AND (sender_id = %s OR receiver_id = %s)",
                    (message_id, user_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn")
        cur.execute("INSERT INTO legacy_message_reactions (scope, message_id, user_id, emoji) VALUES ('dm', %s, %s, %s) ON CONFLICT DO NOTHING",
                    (message_id, user_id, body.emoji))
    return {"status": "ok"}


@router.delete("/messages/dm/{message_id}/reactions", status_code=204)
def unreact_direct(message_id: int, emoji: str = Query(...), user_id: str = Depends(require_user)):
    with get_db() as conn:
        conn.cursor().execute("DELETE FROM legacy_message_reactions WHERE scope = 'dm' AND message_id = %s AND user_id = %s AND emoji = %s",
                              (message_id, user_id, emoji))


@router.post("/groups/{group_id}/messages/{message_id}/reactions", status_code=201)
def react_group(group_id: int, message_id: int, body: ReactionBody, user_id: str = Depends(require_user)):
    _check_emoji(body.emoji)
    with get_db() as conn:
        cur = conn.cursor()
        if not _in_group(cur, group_id, user_id):
            raise HTTPException(status_code=403, detail="Bạn không ở trong nhóm này")
        cur.execute("SELECT 1 FROM group_messages WHERE id = %s AND group_id = %s AND deleted_at IS NULL", (message_id, group_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn")
        cur.execute("INSERT INTO legacy_message_reactions (scope, message_id, user_id, emoji) VALUES ('group', %s, %s, %s) ON CONFLICT DO NOTHING",
                    (message_id, user_id, body.emoji))
    return {"status": "ok"}


@router.delete("/groups/{group_id}/messages/{message_id}/reactions", status_code=204)
def unreact_group(group_id: int, message_id: int, emoji: str = Query(...), user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        if not _in_group(cur, group_id, user_id):
            raise HTTPException(status_code=403, detail="Bạn không ở trong nhóm này")
        cur.execute("DELETE FROM legacy_message_reactions WHERE scope = 'group' AND message_id = %s AND user_id = %s AND emoji = %s",
                    (message_id, user_id, emoji))


# ── Search ──────────────────────────────────────────────────────────────────
def _like(q: str) -> str:
    return "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


@router.get("/messages/search")
def search_messages(
    q: str = Query(min_length=2, max_length=100),
    group_id: Optional[int] = Query(default=None, ge=1),
    partner_id: Optional[str] = Query(default=None),
    user_id: str = Depends(require_user),
):
    """Search only inside conversations the caller belongs to."""
    pattern = _like(q.strip())
    out = []
    with get_db() as conn:
        cur = conn.cursor()
        if group_id is not None:
            if not _in_group(cur, group_id, user_id):
                raise HTTPException(status_code=403, detail="Bạn không ở trong nhóm này")
        if partner_id is None:
            cur.execute(
                """SELECT 'group' AS scope, gm.id, gm.group_id AS conversation_id, gm.sender_id, gm.content, gm.created_at
                   FROM group_messages gm
                   JOIN group_members mem ON mem.group_id = gm.group_id AND mem.user_id = %s AND mem.status = 'joined'
                   WHERE gm.deleted_at IS NULL AND gm.content NOT LIKE %s AND gm.content ILIKE %s
                     AND (%s::int IS NULL OR gm.group_id = %s::int)
                   ORDER BY gm.created_at DESC LIMIT 30""",
                (user_id, ATTACHMENT_PREFIX + "%", pattern, group_id, group_id),
            )
            out += rows_to_list(cur, cur.fetchall())
        if group_id is None:
            cur.execute(
                """SELECT 'dm' AS scope, dm.id,
                          CASE WHEN dm.sender_id = %s THEN dm.receiver_id ELSE dm.sender_id END AS conversation_id,
                          dm.sender_id, dm.content, dm.created_at
                   FROM direct_messages dm
                   WHERE (dm.sender_id = %s OR dm.receiver_id = %s) AND dm.deleted_at IS NULL
                     AND dm.content NOT LIKE %s AND dm.content ILIKE %s
                     AND (%s::text IS NULL OR dm.sender_id = %s::text OR dm.receiver_id = %s::text)
                   ORDER BY dm.created_at DESC LIMIT 30""",
                (user_id, user_id, user_id, ATTACHMENT_PREFIX + "%", pattern, partner_id, partner_id, partner_id),
            )
            out += rows_to_list(cur, cur.fetchall())
    out.sort(key=lambda r: r["created_at"], reverse=True)
    return out[:50]
