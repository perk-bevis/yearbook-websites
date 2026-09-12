from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from database import get_db, row_to_dict, rows_to_list
from auth import require_user

router = APIRouter(tags=["social"])


def _is_friend(cur, user_a: str, user_b: str) -> bool:
    cur.execute(
        "SELECT 1 FROM friendships WHERE user_a = LEAST(%s, %s) AND user_b = GREATEST(%s, %s)",
        (user_a, user_b, user_a, user_b),
    )
    return cur.fetchone() is not None


@router.post("/auth/presence")
def update_presence(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE app_users SET last_seen_at = NOW(), updated_at = NOW() WHERE clerk_user_id = %s",
            (user_id,),
        )
    return {"ok": True}


@router.get("/friends/list")
def list_friends(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT au.clerk_user_id, au.full_name, au.nickname, au.photo_url, au.role,
                   au.last_seen_at,
                   (au.last_seen_at IS NOT NULL AND au.last_seen_at > NOW() - INTERVAL '2 minutes') AS online
            FROM app_users au
            JOIN friendships f ON (
                (f.user_a = %s AND f.user_b = au.clerk_user_id)
                OR (f.user_b = %s AND f.user_a = au.clerk_user_id)
            )
            ORDER BY COALESCE(au.nickname, au.full_name) ASC
            """,
            (user_id, user_id),
        )
        return rows_to_list(cur, cur.fetchall())


@router.get("/friends/requests")
def list_friend_requests(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
                   au.full_name AS sender_name, au.nickname AS sender_nickname,
                   au.photo_url AS sender_photo
            FROM friend_requests fr
            JOIN app_users au ON au.clerk_user_id = fr.sender_id
            WHERE fr.receiver_id = %s AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
            """,
            (user_id,),
        )
        return rows_to_list(cur, cur.fetchall())


@router.get("/friends/status/{target_id}")
def friend_status(target_id: str, user_id: str = Depends(require_user)):
    if target_id == user_id:
        return {"status": "self"}
    with get_db() as conn:
        cur = conn.cursor()
        if _is_friend(cur, user_id, target_id):
            return {"status": "friends"}
        cur.execute(
            "SELECT id, status FROM friend_requests WHERE sender_id = %s AND receiver_id = %s",
            (user_id, target_id),
        )
        outgoing = cur.fetchone()
        if outgoing:
            return {"status": "outgoing", "request_id": outgoing[0]}
        cur.execute(
            "SELECT id, status FROM friend_requests WHERE sender_id = %s AND receiver_id = %s",
            (target_id, user_id),
        )
        incoming = cur.fetchone()
        if incoming:
            return {"status": "incoming", "request_id": incoming[0]}
    return {"status": "none"}


@router.post("/friends/request/{target_id}", status_code=201)
def send_friend_request(target_id: str, user_id: str = Depends(require_user)):
    if target_id == user_id:
        raise HTTPException(status_code=400, detail="Không thể tự kết bạn với chính mình")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM app_users WHERE clerk_user_id = %s", (target_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        if _is_friend(cur, user_id, target_id):
            return {"status": "friends"}
        cur.execute(
            "SELECT id, status FROM friend_requests WHERE sender_id = %s AND receiver_id = %s",
            (target_id, user_id),
        )
        incoming = cur.fetchone()
        if incoming and incoming[1] == "pending":
            cur.execute(
                "INSERT INTO friendships (user_a, user_b) VALUES (LEAST(%s, %s), GREATEST(%s, %s)) "
                "ON CONFLICT DO NOTHING",
                (user_id, target_id, user_id, target_id),
            )
            cur.execute("UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = %s", (incoming[0],))
            return {"status": "friends"}
        cur.execute(
            """
            INSERT INTO friend_requests (sender_id, receiver_id)
            VALUES (%s, %s)
            ON CONFLICT (sender_id, receiver_id)
            DO UPDATE SET status = 'pending', updated_at = NOW()
            RETURNING id
            """,
            (user_id, target_id),
        )
        return {"status": "outgoing", "request_id": cur.fetchone()[0]}


@router.post("/friends/accept/{request_id}")
def accept_friend_request(request_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT sender_id, receiver_id FROM friend_requests WHERE id = %s AND receiver_id = %s AND status = 'pending'",
            (request_id, user_id),
        )
        request = cur.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="Lời mời kết bạn không tồn tại")
        sender_id, receiver_id = request
        cur.execute(
            "INSERT INTO friendships (user_a, user_b) VALUES (LEAST(%s, %s), GREATEST(%s, %s)) ON CONFLICT DO NOTHING",
            (sender_id, receiver_id, sender_id, receiver_id),
        )
        cur.execute(
            "UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = %s",
            (request_id,),
        )
    return {"status": "friends"}


@router.post("/friends/decline/{request_id}")
def decline_friend_request(request_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE friend_requests SET status = 'rejected', updated_at = NOW() "
            "WHERE id = %s AND receiver_id = %s AND status = 'pending' RETURNING id",
            (request_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Lời mời kết bạn không tồn tại")
    return {"status": "none"}


@router.delete("/friends/{target_id}")
def remove_friend(target_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM friendships WHERE user_a = LEAST(%s, %s) AND user_b = GREATEST(%s, %s) RETURNING id",
            (user_id, target_id, user_id, target_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy bạn bè")
    return {"status": "none"}


class CreateGroupRequest(BaseModel):
    name: str
    member_ids: List[str]


@router.get("/groups")
def list_groups(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT g.id, g.name, g.created_by, g.created_at,
                   (SELECT content FROM group_messages gm WHERE gm.group_id = g.id ORDER BY gm.created_at DESC LIMIT 1) AS last_message,
                   (SELECT created_at FROM group_messages gm WHERE gm.group_id = g.id ORDER BY gm.created_at DESC LIMIT 1) AS last_at,
                   (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
            FROM group_conversations g
            JOIN group_members mine ON mine.group_id = g.id AND mine.user_id = %s
            ORDER BY COALESCE(
                (SELECT created_at FROM group_messages gm
                 WHERE gm.group_id = g.id
                 ORDER BY gm.created_at DESC LIMIT 1),
                g.created_at
            ) DESC
            """,
            (user_id,),
        )
        return rows_to_list(cur, cur.fetchall())


@router.post("/groups", status_code=201)
def create_group(body: CreateGroupRequest, user_id: str = Depends(require_user)):
    name = body.name.strip()
    member_ids = list(dict.fromkeys([user_id, *body.member_ids]))
    if not name:
        raise HTTPException(status_code=400, detail="Tên nhóm không được trống")
    if len(member_ids) < 2:
        raise HTTPException(status_code=400, detail="Hãy chọn ít nhất một người bạn")
    with get_db() as conn:
        cur = conn.cursor()
        for member_id in member_ids:
            if member_id != user_id and not _is_friend(cur, user_id, member_id):
                raise HTTPException(status_code=403, detail="Chỉ có thể thêm người đã là bạn")
        cur.execute(
            "INSERT INTO group_conversations (name, created_by) VALUES (%s, %s) RETURNING id",
            (name, user_id),
        )
        group_id = cur.fetchone()[0]
        for member_id in member_ids:
            cur.execute(
                "INSERT INTO group_members (group_id, user_id) VALUES (%s, %s)",
                (group_id, member_id),
            )
    return {"id": group_id, "name": name, "member_count": len(member_ids)}


@router.get("/groups/{group_id}/messages")
def list_group_messages(group_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Bạn không ở trong nhóm này")
        cur.execute(
            """
            SELECT gm.*, au.full_name, au.nickname, au.photo_url
            FROM group_messages gm
            LEFT JOIN app_users au ON au.clerk_user_id = gm.sender_id
            WHERE gm.group_id = %s ORDER BY gm.created_at ASC
            """,
            (group_id,),
        )
        return rows_to_list(cur, cur.fetchall())


class GroupMessageRequest(BaseModel):
    content: str


@router.post("/groups/{group_id}/messages", status_code=201)
def send_group_message(group_id: int, body: GroupMessageRequest, user_id: str = Depends(require_user)):
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được trống")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Bạn không ở trong nhóm này")
        cur.execute(
            "INSERT INTO group_messages (group_id, sender_id, content) VALUES (%s, %s, %s) RETURNING *",
            (group_id, user_id, body.content.strip()),
        )
        return row_to_dict(cur, cur.fetchone())