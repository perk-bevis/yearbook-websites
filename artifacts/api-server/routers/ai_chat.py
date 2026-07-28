import os
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI

router = APIRouter(tags=["ai"])

SYSTEM_PROMPT = """Bạn là trợ lý AI thân thiện của trang kỷ yếu Lớp 9A - THCS Vũ Lăng (khóa 2016-2019).
Bạn giúp học sinh:
- Nhớ lại kỷ niệm và câu chuyện thời học trò
- Gợi ý nội dung để viết lời ngỏ, tâm sự kỷ yếu
- Trả lời câu hỏi về trang web kỷ yếu này
- Chat vui vẻ như một người bạn cùng lớp

Trả lời bằng tiếng Việt, ngắn gọn, thân thiện và dí dỏm. Xưng "mình" với người dùng."""


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


def get_openai_client():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI chưa được cấu hình")
    return OpenAI(api_key=api_key)


@router.post("/ai/chat")
def chat(body: ChatRequest):
    client = get_openai_client()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in body.messages[-20:]:  # keep last 20 messages for context
        messages.append({"role": msg.role, "content": msg.content})

    def stream_response():
        try:
            stream = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=512,
                stream=True,
            )
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield f"data: {json.dumps({'content': content})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
