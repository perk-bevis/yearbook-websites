from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from object_storage import signed_object_url, object_name_from_path

from routers import health, students, gallery, memories, events, teacher_messages, frames, stats
from routers import users, yearbooks, whop_routes, feed, ai_chat, messages, social

app = FastAPI(
    title="Kỷ Yếu Platform API",
    version="2.0.0",
    description="API cho nền tảng kỷ yếu học đường",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api"

# Existing routes
app.include_router(health.router, prefix=PREFIX)
app.include_router(students.router, prefix=PREFIX)
app.include_router(gallery.router, prefix=PREFIX)
app.include_router(memories.router, prefix=PREFIX)
app.include_router(events.router, prefix=PREFIX)
app.include_router(teacher_messages.router, prefix=PREFIX)
app.include_router(frames.router, prefix=PREFIX)
app.include_router(stats.router, prefix=PREFIX)

# New auth + platform routes
app.include_router(users.router, prefix=PREFIX)
app.include_router(yearbooks.router, prefix=PREFIX)
app.include_router(whop_routes.router, prefix=PREFIX)
app.include_router(feed.router, prefix=PREFIX)
app.include_router(ai_chat.router, prefix=PREFIX)
app.include_router(messages.router, prefix=PREFIX)
app.include_router(social.router, prefix=PREFIX)
@app.get(f"{PREFIX}/storage/objects/{{object_path:path}}")
def serve_storage_object(object_path: str):
    try:
        signed_url = signed_object_url("GET", object_name_from_path(object_path), ttl_seconds=3600)
        return RedirectResponse(signed_url)
    except Exception:
        return Response(status_code=404)
