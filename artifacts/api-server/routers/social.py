from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional

from database import get_db, row_to_dict, rows_to_list
from auth import require_user

router = APIRouter(tags=["social"])


def _is_friend(cur, user_a: str, user_b: str) -> bool:
    cur.execute(
        "SELECT 1 FROM friendships WHERE user_a = LEAST(%s, %s) AND user_b = GREATEST(%s, %s) AND status = 'accepted'",
        (user_a, user_b, user_a, user_b),
    )
    return cur.fetchone() is not None


def _is_blocked(cur, user_a: str, user_b: str) -> bool:
    cur.execute(
        "SELECT 1 FROM user_blocks WHERE (blocker_id = %s AND blocked_id = %s) OR (blocker_id = %s AND blocked_id = %s) LIMIT 1",
        (user_a, user_b, user_b, user_a),
    )
    return cur.fetchone() is not None


def _notify(cur, user_id: str, notification_type: str, content: str, link: str):
    cur.execute(
        "INSERT INTO notifications (user_id, type, content, link) VALUES (%s, %s, %s, %s)",
        (user_id, notification_type, content[:500], link),
    )


class FriendRequestBody(BaseModel):
    target_id: str = Field(min_length=1, max_length=255)


def _request_friendship(cur, sender_id: str, target_id: str):
    if sender_id == target_id:
        raise HTTPException(status_code=400, detail="Không thể tự kết bạn với chính mình")
    cur.execute("SELECT full_name, nickname FROM app_users WHERE clerk_user_id = %s", (target_id,))
    target = cur.fetchone()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    if _is_blocked(cur, sender_id, target_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    cur.execute(
        """
        SELECT id, requester_id, addressee_id, status
        FROM friendships
        WHERE user_a = LEAST(%s, %s) AND user_b = GREATEST(%s, %s)
        """,
        (sender_id, target_id, sender_id, target_id),
    )
    existing = cur.fetchone()
    if existing and existing[3] == "accepted":
        return {"status": "friends", "request_id": existing[0]}
    if existing and existing[3] == "pending":
        if existing[1] == sender_id:
            return {"status": "outgoing", "request_id": existing[0]}
        cur.execute("UPDATE friendships SET status = 'accepted' WHERE id = %s", (existing[0],))
        _notify(cur, existing[1], "friend_accepted", "Lời mời kết bạn của bạn đã được chấp nhận.", "/friends")
        return {"status": "friends", "request_id": existing[0]}

    cur.execute(
        "SELECT COUNT(*) FROM friendships WHERE requester_id = %s AND created_at > NOW() - INTERVAL '1 day'",
        (sender_id,),
    )
    if cur.fetchone()[0] >= 10:
        raise HTTPException(status_code=429, detail="Bạn đã gửi tối đa 10 lời mời trong 24 giờ. Hãy thử lại sau.")

    cur.execute(
        """
        INSERT INTO friendships (user_a, user_b, requester_id, addressee_id, status, created_at)
        VALUES (LEAST(%s, %s), GREATEST(%s, %s), %s, %s, 'pending', NOW())
        ON CONFLICT (user_a, user_b) DO UPDATE
        SET requester_id = EXCLUDED.requester_id,
            addressee_id = EXCLUDED.addressee_id,
            status = 'pending',
            created_at = NOW()
        WHERE friendships.status = 'declined'
        RETURNING id
        """,
        (sender_id, target_id, sender_id, target_id, sender_id, target_id),
    )
    request = cur.fetchone()
    if not request:
        raise HTTPException(status_code=409, detail="Đã có lời mời kết bạn đang chờ xử lý")
    _notify(cur, target_id, "friend_request", "Bạn nhận được lời mời kết bạn mới.", "/friends?tab=incoming")
    return {"status": "outgoing", "request_id": request[0]}


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
            ) AND f.status = 'accepted'
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
            SELECT f.id, f.requester_id AS sender_id, f.addressee_id AS receiver_id,
                   f.status, f.created_at, au.full_name AS sender_name,
                   au.nickname AS sender_nickname, au.photo_url AS sender_photo
            FROM friendships f
            JOIN app_users au ON au.clerk_user_id = f.requester_id
            WHERE f.addressee_id = %s AND f.status = 'pending'
            ORDER BY f.created_at DESC
            """,
            (user_id,),
        )
        return rows_to_list(cur, cur.fetchall())


@router.get("/cohorts")
def list_cohorts(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name, year, school_name FROM cohorts ORDER BY year DESC, name")
        return rows_to_list(cur, cur.fetchall())


@router.get("/classes")
def list_classes(
    cohort_id: Optional[int] = Query(default=None, ge=1),
    user_id: str = Depends(require_user),
):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT cl.id, cl.name, cl.cohort_id, c.name AS cohort_name
            FROM classes cl JOIN cohorts c ON c.id = cl.cohort_id
            WHERE (%s IS NULL OR cl.cohort_id = %s)
            ORDER BY c.year DESC, cl.name
            """,
            (cohort_id, cohort_id),
        )
        return rows_to_list(cur, cur.fetchall())


@router.get("/users/search")
def search_users(
    q: str = Query(default="", max_length=80),
    cohort_id: Optional[int] = Query(default=None, ge=1),
    class_id: Optional[int] = Query(default=None, ge=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    user_id: str = Depends(require_user),
):
    term = q.strip()
    pattern = f"%{term}%"
    filters = """
        au.clerk_user_id <> %s
        AND (%s = '' OR LOWER(COALESCE(au.nickname, au.full_name, '')) LIKE LOWER(%s))
        AND (%s IS NULL OR au.cohort_id = %s)
        AND (%s IS NULL OR au.class_id = %s)
        AND (
            au.profile_visibility = 'everyone'
            OR (au.profile_visibility = 'cohort' AND me.cohort_id IS NOT NULL AND au.cohort_id = me.cohort_id)
            OR (au.profile_visibility = 'friends' AND EXISTS (
                SELECT 1 FROM friendships visible_friend
                WHERE visible_friend.status = 'accepted'
                  AND visible_friend.user_a = LEAST(au.clerk_user_id, me.clerk_user_id)
                  AND visible_friend.user_b = GREATEST(au.clerk_user_id, me.clerk_user_id)
            ))
        )
        AND NOT EXISTS (
            SELECT 1 FROM user_blocks b
            WHERE (b.blocker_id = me.clerk_user_id AND b.blocked_id = au.clerk_user_id)
               OR (b.blocker_id = au.clerk_user_id AND b.blocked_id = me.clerk_user_id)
        )
    """
    filter_params = (user_id, term, pattern, cohort_id, cohort_id, class_id, class_id)
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT COUNT(*) FROM app_users au JOIN app_users me ON me.clerk_user_id = %s WHERE {filters}",
            (user_id, *filter_params),
        )
        total = cur.fetchone()[0]
        cur.execute(
            f"""
            SELECT au.clerk_user_id, au.full_name, au.nickname, au.photo_url, au.role,
                   au.school_name, au.class_name, au.cohort_id, au.class_id,
                   CASE
                     WHEN EXISTS (
                       SELECT 1 FROM friendships f
                       WHERE f.status = 'accepted'
                         AND f.user_a = LEAST(au.clerk_user_id, me.clerk_user_id)
                         AND f.user_b = GREATEST(au.clerk_user_id, me.clerk_user_id)
                     ) THEN 'friends'
                     WHEN EXISTS (
                       SELECT 1 FROM friendships f
                       WHERE f.requester_id = me.clerk_user_id
                         AND f.addressee_id = au.clerk_user_id AND f.status = 'pending'
                     ) THEN 'outgoing'
                     WHEN EXISTS (
                       SELECT 1 FROM friendships f
                       WHERE f.requester_id = au.clerk_user_id
                         AND f.addressee_id = me.clerk_user_id AND f.status = 'pending'
                     ) THEN 'incoming'
                     ELSE 'none'
                   END AS friend_status,
                   (SELECT f.id FROM friendships f
                    WHERE f.status = 'pending'
                      AND ((f.requester_id = me.clerk_user_id AND f.addressee_id = au.clerk_user_id)
                        OR (f.requester_id = au.clerk_user_id AND f.addressee_id = me.clerk_user_id))
                    LIMIT 1) AS request_id
            FROM app_users au
            JOIN app_users me ON me.clerk_user_id = %s
            WHERE {filters}
            ORDER BY COALESCE(au.nickname, au.full_name, '') ASC, au.clerk_user_id
            LIMIT %s OFFSET %s
            """,
            (user_id, *filter_params, page_size, (page - 1) * page_size),
        )
        return {
            "items": rows_to_list(cur, cur.fetchall()),
            "total": total,
            "page": page,
            "page_size": page_size,
        }


@router.get("/friends")
def friends_overview(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT au.clerk_user_id, au.full_name, au.nickname, au.photo_url, au.role,
                   au.last_seen_at,
                   (au.last_seen_at IS NOT NULL AND au.last_seen_at > NOW() - INTERVAL '2 minutes') AS online
            FROM friendships f
            JOIN app_users au ON au.clerk_user_id =
                CASE WHEN f.requester_id = %s THEN f.addressee_id ELSE f.requester_id END
            WHERE (f.requester_id = %s OR f.addressee_id = %s) AND f.status = 'accepted'
            ORDER BY COALESCE(au.nickname, au.full_name, '') ASC
            """,
            (user_id, user_id, user_id),
        )
        friends = rows_to_list(cur, cur.fetchall())

        cur.execute(
            """
            SELECT f.id AS request_id, f.requester_id AS sender_id, f.created_at,
                   au.clerk_user_id, au.full_name, au.nickname, au.photo_url
            FROM friendships f JOIN app_users au ON au.clerk_user_id = f.requester_id
            WHERE f.addressee_id = %s AND f.status = 'pending'
            ORDER BY f.created_at DESC
            """,
            (user_id,),
        )
        incoming = rows_to_list(cur, cur.fetchall())

        cur.execute(
            """
            SELECT f.id AS request_id, f.addressee_id AS target_id, f.created_at,
                   au.clerk_user_id, au.full_name, au.nickname, au.photo_url
            FROM friendships f JOIN app_users au ON au.clerk_user_id = f.addressee_id
            WHERE f.requester_id = %s AND f.status = 'pending'
            ORDER BY f.created_at DESC
            """,
            (user_id,),
        )
        outgoing = rows_to_list(cur, cur.fetchall())

        cur.execute(
            """
            WITH me AS (
                SELECT clerk_user_id, cohort_id, class_id FROM app_users WHERE clerk_user_id = %s
            ), my_friends AS (
                SELECT CASE WHEN f.requester_id = me.clerk_user_id
                            THEN f.addressee_id ELSE f.requester_id END AS friend_id
                FROM friendships f CROSS JOIN me
                WHERE f.status = 'accepted'
                  AND (f.requester_id = me.clerk_user_id OR f.addressee_id = me.clerk_user_id)
            ), mutuals AS (
                SELECT CASE WHEN f.requester_id = mf.friend_id
                            THEN f.addressee_id ELSE f.requester_id END AS candidate_id,
                       COUNT(DISTINCT mf.friend_id)::INTEGER AS mutual_count
                FROM my_friends mf JOIN friendships f
                  ON f.status = 'accepted'
                 AND (f.requester_id = mf.friend_id OR f.addressee_id = mf.friend_id)
                GROUP BY candidate_id
            )
            SELECT au.clerk_user_id, au.full_name, au.nickname, au.photo_url,
                   au.school_name, au.class_name, au.cohort_id, au.class_id,
                   COALESCE(mutuals.mutual_count, 0) AS mutual_count
            FROM app_users au
            CROSS JOIN me
            LEFT JOIN mutuals ON mutuals.candidate_id = au.clerk_user_id
            WHERE au.clerk_user_id <> me.clerk_user_id
              AND (au.class_id = me.class_id OR au.cohort_id = me.cohort_id OR mutuals.mutual_count > 0)
              AND NOT EXISTS (
                  SELECT 1 FROM friendships f
                  WHERE f.status IN ('accepted', 'pending')
                    AND f.user_a = LEAST(au.clerk_user_id, me.clerk_user_id)
                    AND f.user_b = GREATEST(au.clerk_user_id, me.clerk_user_id)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM user_blocks b
                  WHERE (b.blocker_id = me.clerk_user_id AND b.blocked_id = au.clerk_user_id)
                     OR (b.blocker_id = au.clerk_user_id AND b.blocked_id = me.clerk_user_id)
              )
              AND (
                  au.profile_visibility = 'everyone'
                  OR (au.profile_visibility = 'cohort' AND me.cohort_id IS NOT NULL AND au.cohort_id = me.cohort_id)
                  OR (au.profile_visibility = 'friends' AND mutuals.mutual_count > 0)
              )
            ORDER BY (au.class_id = me.class_id) DESC NULLS LAST,
                     COALESCE(mutuals.mutual_count, 0) DESC,
                     COALESCE(au.nickname, au.full_name, '') ASC
            LIMIT 8
            """,
            (user_id,),
        )
        suggestions = rows_to_list(cur, cur.fetchall())
    return {"friends": friends, "incoming": incoming, "outgoing": outgoing, "suggestions": suggestions}


@router.get("/friends/status/{target_id}")
def friend_status(target_id: str, user_id: str = Depends(require_user)):
    if target_id == user_id:
        return {"status": "self"}
    with get_db() as conn:
        cur = conn.cursor()
        if _is_friend(cur, user_id, target_id):
            return {"status": "friends"}
        cur.execute(
            "SELECT id FROM friendships WHERE requester_id = %s AND addressee_id = %s AND status = 'pending'",
            (user_id, target_id),
        )
        outgoing = cur.fetchone()
        if outgoing:
            return {"status": "outgoing", "request_id": outgoing[0]}
        cur.execute(
            "SELECT id FROM friendships WHERE requester_id = %s AND addressee_id = %s AND status = 'pending'",
            (target_id, user_id),
        )
        incoming = cur.fetchone()
        if incoming:
            return {"status": "incoming", "request_id": incoming[0]}
    return {"status": "none"}


@router.post("/friends/request", status_code=201)
def send_friend_request_body(body: FriendRequestBody, user_id: str = Depends(require_user)):
    with get_db() as conn:
        return _request_friendship(conn.cursor(), user_id, body.target_id)


@router.post("/friends/request/{target_id}", status_code=201)
def send_friend_request(target_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        return _request_friendship(conn.cursor(), user_id, target_id)


@router.post("/friends/{request_id}/accept")
@router.post("/friends/accept/{request_id}")
def accept_friend_request(request_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT requester_id, addressee_id FROM friendships
            WHERE id = %s AND addressee_id = %s AND status = 'pending'
            """,
            (request_id, user_id),
        )
        request = cur.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="Lời mời kết bạn không tồn tại")
        sender_id, _ = request
        cur.execute("UPDATE friendships SET status = 'accepted' WHERE id = %s", (request_id,))
        _notify(cur, sender_id, "friend_accepted", "Lời mời kết bạn của bạn đã được chấp nhận.", "/friends")
        cur.execute(
            "UPDATE friend_requests SET status = 'accepted', updated_at = NOW() "
            "WHERE sender_id = %s AND receiver_id = %s AND status = 'pending'",
            (sender_id, user_id),
        )
    return {"status": "friends"}


@router.post("/friends/{request_id}/decline")
@router.post("/friends/decline/{request_id}")
def decline_friend_request(request_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE friendships SET status = 'declined'
            WHERE id = %s AND addressee_id = %s AND status = 'pending'
            RETURNING requester_id, addressee_id
            """,
            (request_id, user_id),
        )
        request = cur.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="Lời mời kết bạn không tồn tại")
        cur.execute(
            "UPDATE friend_requests SET status = 'rejected', updated_at = NOW() "
            "WHERE sender_id = %s AND receiver_id = %s AND status = 'pending'",
            (request[0], user_id),
        )
    return {"status": "none"}


@router.delete("/friends/{target_id}")
def remove_friend(target_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM friendships WHERE user_a = LEAST(%s, %s) AND user_b = GREATEST(%s, %s) "
            "AND (requester_id = %s OR addressee_id = %s) RETURNING id",
            (user_id, target_id, user_id, target_id, user_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy bạn bè")
        cur.execute(
            "DELETE FROM friend_requests WHERE (sender_id = %s AND receiver_id = %s) "
            "OR (sender_id = %s AND receiver_id = %s)",
            (user_id, target_id, target_id, user_id),
        )
    return {"status": "none"}


class CreateGroupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    member_ids: List[str] = Field(default_factory=list, max_length=50)
    description: str = Field(default="", max_length=500)
    cohort_id: Optional[int] = Field(default=None, ge=1)
    class_id: Optional[int] = Field(default=None, ge=1)
    privacy: str = "private"


class GroupUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=500)
    privacy: Optional[str] = None


class GroupInviteRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=255)


class GroupPostRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class GroupRoleRequest(BaseModel):
    role: str


@router.get("/groups")
def list_groups(user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT g.id, g.name, g.created_by, g.created_at,
                   (SELECT CASE
                       WHEN gm.content LIKE 'YB_ATTACHMENT:%%' AND gm.content LIKE '%%"type":"audio"%%' THEN 'Tin nhắn thoại'
                       WHEN gm.content LIKE 'YB_ATTACHMENT:%%' AND gm.content LIKE '%%"type":"image"%%' THEN 'Đã gửi ảnh'
                       WHEN gm.content LIKE 'YB_ATTACHMENT:%%' THEN 'Đã gửi tệp'
                       ELSE gm.content
                    END
                    FROM group_messages gm WHERE gm.group_id = g.id ORDER BY gm.created_at DESC LIMIT 1) AS last_message,
                   (SELECT created_at FROM group_messages gm WHERE gm.group_id = g.id ORDER BY gm.created_at DESC LIMIT 1) AS last_at,
                    (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND status = 'joined') AS member_count
            FROM group_conversations g
             JOIN group_members mine ON mine.group_id = g.id AND mine.user_id = %s AND mine.status = 'joined'
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
    if body.privacy not in ("public", "private"):
        raise HTTPException(status_code=400, detail="Chế độ riêng tư không hợp lệ")
    with get_db() as conn:
        cur = conn.cursor()
        for member_id in member_ids:
            if member_id != user_id and not _is_friend(cur, user_id, member_id):
                raise HTTPException(status_code=403, detail="Chỉ có thể thêm người đã là bạn")
        if body.class_id:
            cur.execute("SELECT cohort_id FROM classes WHERE id = %s", (body.class_id,))
            class_row = cur.fetchone()
            if not class_row:
                raise HTTPException(status_code=404, detail="Không tìm thấy lớp")
            if body.cohort_id and body.cohort_id != class_row[0]:
                raise HTTPException(status_code=400, detail="Lớp không thuộc khóa đã chọn")
            cohort_id = class_row[0]
        else:
            cohort_id = body.cohort_id
        cur.execute(
            """
            INSERT INTO group_conversations
                (name, created_by, description, cohort_id, class_id, owner_id, privacy)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (name, user_id, body.description.strip(), cohort_id, body.class_id, user_id, body.privacy),
        )
        group_id = cur.fetchone()[0]
        for member_id in member_ids:
            cur.execute(
                """
                INSERT INTO group_members (group_id, user_id, role, status)
                VALUES (%s, %s, %s, 'joined')
                """,
                (group_id, member_id, "owner" if member_id == user_id else "member"),
            )
    return {
        "id": group_id,
        "name": name,
        "description": body.description.strip(),
        "cohort_id": cohort_id,
        "class_id": body.class_id,
        "owner_id": user_id,
        "privacy": body.privacy,
        "member_count": len(member_ids),
    }


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