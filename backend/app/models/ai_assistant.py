from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any, List
from datetime import datetime
from enum import Enum


class ChatMessage(BaseModel):
    """聊天消息"""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ParsedDataType(str, Enum):
    """解析数据类型"""
    EXPENSE = "expense"
    INCOME = "income"
    FLIGHT = "flight"
    INVESTMENT = "investment"
    PROJECT = "project"


class ParsedData(BaseModel):
    """AI 解析的数据"""
    data_type: ParsedDataType
    data: Dict[str, Any]
    confidence: float = 1.0


class ChatRequest(BaseModel):
    """聊天请求"""
    message: str
    history: list[ChatMessage] = []


class VisionRequest(BaseModel):
    """Vision 请求（带图片）"""
    message: str
    image_base64: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    """聊天响应"""
    message: str
    parsed_data: Optional[ParsedData] = None
    needs_confirmation: bool = False
    submission_result: Optional[Dict[str, Any]] = None


class LLMConfigProfile(BaseModel):
    """LLM 配置档案"""
    id: Optional[str] = None
    name: str
    api_key: str
    model: str = "deepseek-chat"
    base_url: Optional[str] = None
    is_default: bool = False
    # 能力支持
    supports_vision: bool = False
    supports_reasoning: bool = False
    supports_mcp: bool = False
    supports_skills: bool = False
    supports_streaming: bool = True
    created_at: Optional[str] = None


class Conversation(BaseModel):
    """对话记录"""
    id: Optional[str] = None
    title: str = "New Conversation"
    messages: list[ChatMessage] = []
    config_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
