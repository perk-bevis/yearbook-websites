from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import health, students, gallery, memories, events, teacher_messages, frames, stats

app = FastAPI(
    title="Kỷ Yếu 9A - THCS Vũ Lăng",
    version="1.0.0",
    description="API cho website kỷ yếu lớp 9A niên khóa 2016-2019",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api"

app.include_router(health.router, prefix=PREFIX)
app.include_router(students.router, prefix=PREFIX)
app.include_router(gallery.router, prefix=PREFIX)
app.include_router(memories.router, prefix=PREFIX)
app.include_router(events.router, prefix=PREFIX)
app.include_router(teacher_messages.router, prefix=PREFIX)
app.include_router(frames.router, prefix=PREFIX)
app.include_router(stats.router, prefix=PREFIX)
