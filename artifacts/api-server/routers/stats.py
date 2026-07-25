from fastapi import APIRouter
from database import get_db

router = APIRouter(tags=["stats"])


@router.get("/stats")
def get_stats():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM students")
            student_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM photos")
            photo_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM memories")
            memory_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM events")
            event_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM teacher_messages")
            teacher_message_count = cur.fetchone()[0]
            return {
                "student_count": student_count,
                "photo_count": photo_count,
                "memory_count": memory_count,
                "event_count": event_count,
                "teacher_message_count": teacher_message_count,
            }
