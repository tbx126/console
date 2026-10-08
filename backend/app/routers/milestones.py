"""Milestones across portfolio, travel and gaming."""
from typing import Optional

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.services.milestone_service import milestone_service

router = APIRouter()


class EmojiUpdate(BaseModel):
    emoji: Optional[str] = Field(default=None, max_length=16)


@router.get("")
async def list_milestones():
    return await run_in_threadpool(milestone_service.compute)


@router.put("/{milestone_id}/emoji")
async def set_emoji(milestone_id: str, body: EmojiUpdate):
    await run_in_threadpool(milestone_service.set_emoji, milestone_id[:80], (body.emoji or "").strip() or None)
    return {"id": milestone_id, "emoji": body.emoji}
