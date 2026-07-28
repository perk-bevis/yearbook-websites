from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health, students, gallery, memories, events, teacher_messages, frames, stats
from routers import users, yearbooks, whop_routes, feed, ai_chat

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
