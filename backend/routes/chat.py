import logging
from typing import Literal, Optional, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.chatbot import chat_with_gemini

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


class Message(BaseModel):
    role: Literal["user", "assistant", "model", "system"]
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    message: Optional[str] = None
    messages: Optional[list[Message]] = None


class ChatResponse(BaseModel):
    response: str
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Chat with StromeSense AI using real cyclone, risk engine, and weather data."""
    query = ""

    if request.message and request.message.strip():
        query = request.message.strip()
    elif request.messages:
        # Get the latest user message from conversation history
        user_messages = [m.content for m in request.messages if m.role == "user" and m.content.strip()]
        if user_messages:
            query = user_messages[-1].strip()
        else:
            query = request.messages[-1].content.strip()

    if not query:
        raise HTTPException(status_code=400, detail="A non-empty 'message' or 'messages' list is required.")

    try:
        response_text = await chat_with_gemini(query)
        return ChatResponse(
            response=response_text,
            reply=response_text,
        )
    except Exception as e:
        logger.error(f"Unhandled error during chat: {e}", exc_info=True)
        fallback = "The AI cyclone assistant encountered an unexpected error. Please try again later."
        return ChatResponse(
            response=fallback,
            reply=fallback,
        )
