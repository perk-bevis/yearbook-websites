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


def _group_membership(cur, group_id: int, user_id: str):
    cur.execute(
        """
        SELECT g.owner_id, g.privacy, g.is_default, gm.role, gm.status
        FROM group_conversations g
        LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = %s
        WHERE g.id = %s
        """,
        (user_id, group_id),
    )
    return cur.fetchone()


def _require_group_admin(cur, group_id: int, user_id: str):
    membership = _group_membership(cur, group_id, user_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
    owner_id, _, _, role, status = membership
    if status != "joined" or (owner_id != user_id and role not in ("owner", "admin")):
        raise HTTPException(status_code=403, detail="Bạn không có quyền quản lý nhóm")
    return membership


@router.get("/groups/discover")
def discover_groups(
    q: str = Query(default="", max_length=80),
    cohort_id: Optional[int] = Query(default=None, ge=1),
    class_id: Optional[int] = Query(default=None, ge=1),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    user_id: str = Depends(require_user),
):
    term = q.strip()
    pattern = f"%{term}%"
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT COUNT(*)
            FROM group_conversations g
            WHERE g.privacy = 'public'
              AND (%s = '' OR LOWER(g.name) LIKE LOWER(%s) OR LOWER(g.description) LIKE LOWER(%s))
              AND (%s IS NULL OR g.cohort_id = %s)
              AND (%s IS NULL OR g.class_id = %s)
            """,
            (term, pattern, pattern, cohort_id, cohort_id, class_id, class_id),
        )
        total = cur.fetchone()[0]
        cur.execute(
            """
            SELECT g.id, g.name, g.description, g.cohort_id, g.class_id,
                   g.owner_id, g.privacy, g.is_default, g.created_at,
                   COALESCE(m.member_count, 0) AS member_count,
                   mine.status AS my_status, mine.role AS my_role,
                   c.name AS cohort_name, cl.name AS class_name
            FROM group_conversations g
            LEFT JOIN cohorts c ON c.id = g.cohort_id
            LEFT JOIN classes cl ON cl.id = g.class_id
            LEFT JOIN group_members mine ON mine.group_id = g.id AND mine.user_id = %s
            LEFT JOIN LATERAL (
                SELECT COUNT(*) AS member_count
                FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'joined'
            ) m ON TRUE
            WHERE g.privacy = 'public'
              AND (%s = '' OR LOWER(g.name) LIKE LOWER(%s) OR LOWER(g.description) LIKE LOWER(%s))
              AND (%s IS NULL OR g.cohort_id = %s)
              AND (%s IS NULL OR g.class_id = %s)
            ORDER BY g.is_default DESC, g.created_at DESC, g.name
            LIMIT %s OFFSET %s
            """,
            (
                user_id, term, pattern, pattern, cohort_id, cohort_id, class_id, class_id,
                page_size, (page - 1) * page_size,
            ),
        )
        return {"items": rows_to_list(cur, cur.fetchall()), "total": total, "page": page, "page_size": page_size}


@router.get("/groups/{group_id}")
def get_group(group_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        membership = _group_membership(cur, group_id, user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
        owner_id, privacy, _, _, member_status = membership
        if privacy == "private" and member_status not in ("joined", "invited", "requested") and owner_id != user_id:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
        cur.execute(
            """
            SELECT g.id, g.name, g.description, g.cohort_id, g.class_id,
                   g.owner_id, g.privacy, g.is_default, g.created_at,
                   c.name AS cohort_name, cl.name AS class_name,
                   COALESCE((SELECT COUNT(*) FROM group_members gm
                             WHERE gm.group_id = g.id AND gm.status = 'joined'), 0) AS member_count,
                   mine.role AS my_role, mine.status AS my_status
            FROM group_conversations g
            LEFT JOIN cohorts c ON c.id = g.cohort_id
            LEFT JOIN classes cl ON cl.id = g.class_id
            LEFT JOIN group_members mine ON mine.group_id = g.id AND mine.user_id = %s
            WHERE g.id = %s
            """,
            (user_id, group_id),
        )
        group = row_to_dict(cur, cur.fetchone())
        cur.execute(
            """
            SELECT au.clerk_user_id, au.full_name, au.nickname, au.photo_url,
                   gm.role, gm.status, gm.joined_at
            FROM group_members gm
            LEFT JOIN app_users au ON au.clerk_user_id = gm.user_id
            WHERE gm.group_id = %s AND gm.status = 'joined'
            ORDER BY CASE gm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, gm.joined_at
            """,
            (group_id,),
        )
        group["members"] = rows_to_list(cur, cur.fetchall())
        group["pending_members"] = []
        if group.get("owner_id") == user_id or group.get("my_role") in ("owner", "admin"):
            cur.execute(
                """
                SELECT au.clerk_user_id, au.full_name, au.nickname, au.photo_url,
                       gm.role, gm.status, gm.joined_at
                FROM group_members gm
                LEFT JOIN app_users au ON au.clerk_user_id = gm.user_id
                WHERE gm.group_id = %s AND gm.status IN ('requested', 'invited')
                ORDER BY gm.joined_at NULLS FIRST
                """,
                (group_id,),
            )
            group["pending_members"] = rows_to_list(cur, cur.fetchall())
        return group


@router.post("/groups/{group_id}/join")
def join_group(group_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT privacy, name FROM group_conversations WHERE id = %s", (group_id,))
        group = cur.fetchone()
        if not group:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
        privacy, group_name = group
        cur.execute("SELECT status FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
        existing = cur.fetchone()
        if existing and existing[0] == "joined":
            return {"status": "joined"}
        next_status = "joined" if privacy == "public" or (existing and existing[0] == "invited") else "requested"
        cur.execute(
            """
            INSERT INTO group_members (group_id, user_id, role, status)
            VALUES (%s, %s, 'member', %s)
            ON CONFLICT (group_id, user_id)
            DO UPDATE SET status = EXCLUDED.status,
                          joined_at = CASE WHEN EXCLUDED.status = 'joined' THEN NOW() ELSE group_members.joined_at END
            """,
            (group_id, user_id, next_status),
        )
        if next_status == "requested":
            cur.execute(
                "SELECT user_id FROM group_members WHERE group_id = %s AND role IN ('owner', 'admin') AND status = 'joined'",
                (group_id,),
            )
            for (admin_id,) in cur.fetchall():
                if admin_id != user_id:
                    _notify(cur, admin_id, "group_join_request", f"Có yêu cầu tham gia nhóm “{group_name}”.", f"/groups/{group_id}")
        return {"status": next_status}


@router.get("/groups/{group_id}/posts")
def list_group_posts(
    group_id: int,
    limit: int = Query(default=30, ge=1, le=100),
    user_id: str = Depends(require_user),
):
    with get_db() as conn:
        cur = conn.cursor()
        membership = _group_membership(cur, group_id, user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
        owner_id, privacy, _, _, member_status = membership
        if privacy == "private" and member_status != "joined" and owner_id != user_id:
            raise HTTPException(status_code=403, detail="Bạn chưa tham gia nhóm này")
        cur.execute(
            """
            SELECT p.id, p.group_id, p.author_id, p.content, p.created_at,
                   au.full_name, au.nickname, au.photo_url
            FROM group_posts p
            LEFT JOIN app_users au ON au.clerk_user_id = p.author_id
            WHERE p.group_id = %s
            ORDER BY p.created_at DESC, p.id DESC
            LIMIT %s
            """,
            (group_id, limit),
        )
        return rows_to_list(cur, cur.fetchall())


@router.post("/groups/{group_id}/posts", status_code=201)
def create_group_post(group_id: int, body: GroupPostRequest, user_id: str = Depends(require_user)):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Bài viết không được để trống")
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s AND status = 'joined'",
            (group_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Chỉ thành viên đã tham gia mới được đăng bài")
        cur.execute(
            "INSERT INTO group_posts (group_id, author_id, content) VALUES (%s, %s, %s) RETURNING *",
            (group_id, user_id, content),
        )
        return row_to_dict(cur, cur.fetchone())


@router.post("/groups/{group_id}/members/{member_id}/invite")
def invite_group_member(group_id: int, member_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        _require_group_admin(cur, group_id, user_id)
        if _is_blocked(cur, user_id, member_id):
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        cur.execute("SELECT 1 FROM app_users WHERE clerk_user_id = %s", (member_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        cur.execute("SELECT name FROM group_conversations WHERE id = %s", (group_id,))
        group_name = cur.fetchone()[0]
        cur.execute(
            """
            INSERT INTO group_members (group_id, user_id, role, status)
            VALUES (%s, %s, 'member', 'invited')
            ON CONFLICT (group_id, user_id) DO UPDATE SET
                status = CASE WHEN group_members.status = 'joined' THEN 'joined' ELSE 'invited' END
            RETURNING status
            """,
            (group_id, member_id),
        )
        status = cur.fetchone()[0]
        _notify(cur, member_id, "group_invite", f"Bạn được mời tham gia nhóm “{group_name}”.", f"/groups/{group_id}")
        return {"status": status}


@router.post("/groups/{group_id}/members/{member_id}/approve")
def approve_group_member(group_id: int, member_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        _require_group_admin(cur, group_id, user_id)
        cur.execute(
            """
            UPDATE group_members SET status = 'joined', joined_at = NOW()
            WHERE group_id = %s AND user_id = %s AND status IN ('requested', 'invited')
            RETURNING user_id
            """,
            (group_id, member_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy lời mời đang chờ")
        _notify(cur, member_id, "group_join_approved", "Yêu cầu tham gia nhóm của bạn đã được chấp nhận.", f"/groups/{group_id}")
        return {"status": "joined"}


@router.delete("/groups/{group_id}/members/{member_id}")
def remove_group_member(group_id: int, member_id: str, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        membership = _group_membership(cur, group_id, user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
        owner_id, _, _, actor_role, actor_status = membership
        if actor_status != "joined":
            raise HTTPException(status_code=403, detail="Bạn không có quyền quản lý nhóm")
        cur.execute("SELECT role, status FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, member_id))
        target = cur.fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Không tìm thấy thành viên")
        target_role, _ = target
        if member_id == user_id:
            if owner_id == user_id or actor_role == "owner":
                raise HTTPException(status_code=400, detail="Chủ nhóm không thể rời nhóm; hãy xóa nhóm hoặc chuyển quyền sở hữu.")
        elif owner_id != user_id and actor_role != "owner":
            if actor_role != "admin" or target_role != "member":
                raise HTTPException(status_code=403, detail="Bạn không có quyền xóa thành viên này")
        elif target_role == "owner":
            raise HTTPException(status_code=400, detail="Không thể xóa chủ nhóm")
        cur.execute("DELETE FROM group_members WHERE group_id = %s AND user_id = %s", (group_id, member_id))
        return {"status": "removed"}


@router.patch("/groups/{group_id}")
def update_group(group_id: int, body: GroupUpdateRequest, user_id: str = Depends(require_user)):
    values = body.model_dump(exclude_unset=True)
    if "privacy" in values and values["privacy"] not in ("public", "private"):
        raise HTTPException(status_code=400, detail="Chế độ riêng tư không hợp lệ")
    with get_db() as conn:
        cur = conn.cursor()
        membership = _require_group_admin(cur, group_id, user_id)
        owner_id, _, is_default, _, _ = membership
        if is_default:
            raise HTTPException(status_code=403, detail="Không thể chỉnh sửa nhóm mặc định của lớp/khóa")
        if values.get("privacy") is not None and owner_id != user_id:
            raise HTTPException(status_code=403, detail="Chỉ chủ nhóm mới có thể đổi chế độ riêng tư")
        if not values:
            cur.execute("SELECT id, name, description, privacy FROM group_conversations WHERE id = %s", (group_id,))
            return row_to_dict(cur, cur.fetchone())
        columns = {"name": "name", "description": "description", "privacy": "privacy"}
        assignments, params = [], []
        for key, value in values.items():
            if key in columns and value is not None:
                assignments.append(f"{columns[key]} = %s")
                params.append(value.strip() if isinstance(value, str) else value)
        if not assignments:
            raise HTTPException(status_code=400, detail="Không có thông tin hợp lệ để cập nhật")
        params.append(group_id)
        cur.execute(
            f"UPDATE group_conversations SET {', '.join(assignments)} WHERE id = %s RETURNING id, name, description, privacy",
            params,
        )
        return row_to_dict(cur, cur.fetchone())


@router.patch("/groups/{group_id}/members/{member_id}/role")
def update_group_role(group_id: int, member_id: str, body: GroupRoleRequest, user_id: str = Depends(require_user)):
    if body.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Vai trò chỉ có thể là admin hoặc member")
    with get_db() as conn:
        cur = conn.cursor()
        membership = _group_membership(cur, group_id, user_id)
        if not membership:
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm")
        owner_id, _, is_default, _, status = membership
        if status != "joined" or owner_id != user_id or is_default:
            raise HTTPException(status_code=403, detail="Chỉ chủ nhóm được quản lý vai trò quản trị viên")
        cur.execute(
            """
            UPDATE group_members SET role = %s
            WHERE group_id = %s AND user_id = %s AND status = 'joined' AND role <> 'owner'
            RETURNING user_id, role
            """,
            (body.role, group_id, member_id),
        )
        updated = cur.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Không tìm thấy thành viên")
        return {"status": "updated", "user_id": updated[0], "role": updated[1]}


@router.delete("/groups/{group_id}")
def delete_group(group_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM group_conversations WHERE id = %s AND owner_id = %s AND is_default = FALSE RETURNING id",
            (group_id, user_id),
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Không tìm thấy nhóm hoặc bạn không phải chủ nhóm")
    return {"status": "deleted"}


@router.get("/groups/{group_id}/messages")
def list_group_messages(group_id: int, user_id: str = Depends(require_user)):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s AND status = 'joined'", (group_id, user_id))
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
        cur.execute("SELECT 1 FROM group_members WHERE group_id = %s AND user_id = %s AND status = 'joined'", (group_id, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Bạn không ở trong nhóm này")
        cur.execute(
            "INSERT INTO group_messages (group_id, sender_id, content) VALUES (%s, %s, %s) RETURNING *",
            (group_id, user_id, body.content.strip()),
        )
        return row_to_dict(cur, cur.fetchone())