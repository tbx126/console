from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import List
from datetime import datetime
import uuid
import json
from app.models.ai_assistant import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    LLMConfigProfile,
    Conversation,
    VisionRequest
)
from app.models.finance import Expense, Income
from app.models.travel import Flight
from app.models.portfolio import Investment
from app.services.llm_service import llm_service
from app.services.data_manager import data_manager
from app.services.finance_service import finance_service
from app.services.travel_service import travel_service
from app.services.portfolio_service import portfolio_service
from app.config import settings

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """发送聊天消息"""
    try:
        # 获取当前激活的配置
        config_data = data_manager.read_data(settings.config_data_file)
        configs = config_data.get("llm_configs", [])

        # 找到默认配置
        active_config = None
        for c in configs:
            if c.get("is_default"):
                active_config = LLMConfigProfile(**c)
                break

        if not active_config:
            raise HTTPException(
                status_code=400,
                detail="No active LLM config. Please configure in settings."
            )

        # 调用 LLM
        response_text = await llm_service.chat(
            request.message,
            request.history,
            active_config
        )

        # 尝试解析结构化数据
        parsed_data = await llm_service.parse_response(response_text)

        # 添加调试输出
        print(f"[DEBUG] LLM Response: {response_text[:300]}")
        print(f"[DEBUG] Parsed Data: {parsed_data}")

        # 自动提交解析的数据
        submission_result = None
        if parsed_data:
            try:
                data_type = parsed_data.data_type
                data = parsed_data.data

                print(f"[DEBUG] Data Type: {data_type}")
                print(f"[DEBUG] Data: {data}")

                if data_type == "expense":
                    finance_service.create_expense(Expense(**data))
                    submission_result = {"success": True, "message": "Expense added successfully!"}
                elif data_type == "income":
                    finance_service.create_income(Income(**data))
                    submission_result = {"success": True, "message": "Income added successfully!"}
                elif data_type == "flight":
                    # 字段名映射：兼容旧字段名，处理None值
                    flight_data = {
                        "airline": data.get("airline") or data.get("flight_number", "Unknown Airline"),
                        "flight_number": data.get("flight_number") or data.get("airline", "UNKNOWN"),
                        "origin": data.get("origin") or data.get("from", ""),
                        "destination": data.get("destination") or data.get("to", ""),
                        "date": data.get("date", ""),
                        "cost": data.get("cost"),
                        "travel_class": data.get("travel_class") or data.get("class") or "economy"
                    }
                    print(f"[DEBUG] Mapped flight data: {flight_data}")
                    travel_service.create_flight(Flight(**flight_data))
                    submission_result = {"success": True, "message": "Flight added successfully!"}
                elif data_type == "investment":
                    portfolio_service.create_investment(Investment(**data))
                    submission_result = {"success": True, "message": "Investment added successfully!"}
                else:
                    submission_result = {"success": False, "message": f"Unknown data type: {data_type}"}
            except Exception as submit_error:
                import traceback
                error_detail = traceback.format_exc()
                print(f"[DEBUG] Exception occurred: {submit_error}")
                print(f"[DEBUG] Traceback: {error_detail}")
                submission_result = {"success": False, "message": f"Failed to submit data: {str(submit_error)}"}

        return ChatResponse(
            message=response_text,
            parsed_data=parsed_data,
            needs_confirmation=False,
            submission_result=submission_result
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """流式发送聊天消息"""
    config_data = data_manager.read_data(settings.config_data_file)
    configs = config_data.get("llm_configs", [])

    active_config = None
    for c in configs:
        if c.get("is_default"):
            active_config = LLMConfigProfile(**c)
            break

    if not active_config:
        raise HTTPException(status_code=400, detail="No active LLM config")

    print(f"[STREAM DEBUG] Using config: {active_config.name}, model: {active_config.model}, base_url: {active_config.base_url}")

    async def generate():
        try:
            async for chunk in llm_service.chat_stream(
                request.message,
                request.history,
                active_config,
                temperature=request.temperature,
                top_p=request.top_p,
                max_tokens=request.max_tokens,
                system_prompt=request.system_prompt
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"[STREAM ERROR] Exception in generate: {type(e).__name__}: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/parse")
async def parse_text(request: dict):
    """解析文本中的结构化数据"""
    text = request.get("text", "")
    parsed = await llm_service.parse_response(text)
    if parsed:
        return {"parsed": True, "data": parsed.dict()}
    return {"parsed": False, "data": None}


@router.post("/submit")
async def submit_data(request: dict):
    """提交解析的数据"""
    data_type = request.get("data_type")
    data = request.get("data")

    if not data_type or not data:
        raise HTTPException(status_code=400, detail="Missing data_type or data")

    try:
        if data_type == "expense":
            expense_data = {
                "amount": data.get("amount"),
                "category": data.get("category") or "other",
                "merchant": data.get("merchant") or "",
                "date": data.get("date") or "",
                "notes": data.get("notes"),
            }
            finance_service.create_expense(Expense(**expense_data))
            return {"success": True, "message": "支出已记录"}
        elif data_type == "income":
            finance_service.create_income(Income(**data))
            return {"success": True, "message": "收入已记录"}
        elif data_type == "flight":
            flight_data = {
                "airline": data.get("airline") or "Unknown",
                "flight_number": data.get("flight_number") or "UNKNOWN",
                "origin": data.get("origin") or "",
                "destination": data.get("destination") or "",
                "date": data.get("date", ""),
                "cost": data.get("cost"),
                "travel_class": data.get("travel_class") or "economy"
            }
            travel_service.create_flight(Flight(**flight_data))
            return {"success": True, "message": "航班已记录"}
        elif data_type == "investment":
            portfolio_service.create_investment(Investment(**data))
            return {"success": True, "message": "投资已记录"}
        else:
            return {"success": False, "message": f"未知数据类型: {data_type}"}
    except Exception as e:
        return {"success": False, "message": f"记录失败: {str(e)}"}


@router.post("/chat/vision")
async def chat_vision(request: VisionRequest):
    """发送带图片的聊天消息"""
    config_data = data_manager.read_data(settings.config_data_file)
    configs = config_data.get("llm_configs", [])

    active_config = None
    for c in configs:
        if c.get("is_default"):
            active_config = LLMConfigProfile(**c)
            break

    if not active_config:
        raise HTTPException(status_code=400, detail="No active LLM config")

    if not active_config.supports_vision:
        raise HTTPException(status_code=400, detail="Current model does not support vision")

    try:
        response = await llm_service.chat_vision(
            request.message,
            request.image_base64,
            request.history,
            active_config,
            temperature=request.temperature,
            top_p=request.top_p,
            max_tokens=request.max_tokens,
            system_prompt=request.system_prompt
        )
        return {"message": response}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_connection():
    """测试 LLM 连接"""
    try:
        config_data = data_manager.read_data(settings.config_data_file)
        configs = config_data.get("llm_configs", [])

        active_config = None
        for c in configs:
            if c.get("is_default"):
                active_config = LLMConfigProfile(**c)
                break

        if not active_config:
            raise HTTPException(status_code=400, detail="No active LLM config")

        # 发送测试消息
        response = await llm_service.chat("Hello", [], active_config)
        return {"status": "success", "message": "Connection successful"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ============ 多配置管理 ============

@router.get("/configs", response_model=List[LLMConfigProfile])
async def get_configs():
    """获取所有 LLM 配置"""
    data = data_manager.read_data(settings.config_data_file)
    return data.get("llm_configs", [])


@router.post("/configs", response_model=LLMConfigProfile)
async def create_config(config: LLMConfigProfile):
    """创建新的 LLM 配置"""
    data = data_manager.read_data(settings.config_data_file)
    if "llm_configs" not in data:
        data["llm_configs"] = []

    config.id = str(uuid.uuid4())
    config.created_at = datetime.now().isoformat()

    # 如果是第一个配置或标记为默认，设为默认
    if len(data["llm_configs"]) == 0 or config.is_default:
        for c in data["llm_configs"]:
            c["is_default"] = False
        config.is_default = True

    data["llm_configs"].append(config.dict())
    data_manager.write_data(settings.config_data_file, data)
    return config


@router.put("/configs/{config_id}", response_model=LLMConfigProfile)
async def update_config_profile(config_id: str, config: LLMConfigProfile):
    """更新 LLM 配置"""
    data = data_manager.read_data(settings.config_data_file)
    configs = data.get("llm_configs", [])

    for i, c in enumerate(configs):
        if c["id"] == config_id:
            config.id = config_id
            config.created_at = c.get("created_at")
            if config.is_default:
                for other in configs:
                    other["is_default"] = False
            configs[i] = config.dict()
            data["llm_configs"] = configs
            data_manager.write_data(settings.config_data_file, data)
            return config

    raise HTTPException(status_code=404, detail="Config not found")


@router.delete("/configs/{config_id}")
async def delete_config(config_id: str):
    """删除 LLM 配置"""
    data = data_manager.read_data(settings.config_data_file)
    configs = data.get("llm_configs", [])
    data["llm_configs"] = [c for c in configs if c["id"] != config_id]
    data_manager.write_data(settings.config_data_file, data)
    return {"message": "Config deleted"}


@router.post("/configs/{config_id}/activate")
async def activate_config(config_id: str):
    """激活指定配置为当前使用"""
    data = data_manager.read_data(settings.config_data_file)
    configs = data.get("llm_configs", [])

    target = None
    for c in configs:
        if c["id"] == config_id:
            target = c
            c["is_default"] = True
        else:
            c["is_default"] = False

    if not target:
        raise HTTPException(status_code=404, detail="Config not found")

    data["llm_configs"] = configs
    data_manager.write_data(settings.config_data_file, data)
    return {"message": "Config activated"}


# ============ 对话管理 ============

@router.get("/conversations", response_model=List[Conversation])
async def get_conversations():
    """获取所有对话"""
    data = data_manager.read_data(settings.config_data_file)
    return data.get("conversations", [])


@router.post("/conversations", response_model=Conversation)
async def create_conversation(conversation: Conversation):
    """创建新对话"""
    data = data_manager.read_data(settings.config_data_file)
    if "conversations" not in data:
        data["conversations"] = []

    conversation.id = str(uuid.uuid4())
    conversation.created_at = datetime.now().isoformat()
    conversation.updated_at = conversation.created_at

    data["conversations"].append(conversation.dict())
    data_manager.write_data(settings.config_data_file, data)
    return conversation


@router.get("/conversations/{conv_id}", response_model=Conversation)
async def get_conversation(conv_id: str):
    """获取单个对话"""
    data = data_manager.read_data(settings.config_data_file)
    for conv in data.get("conversations", []):
        if conv["id"] == conv_id:
            return Conversation(**conv)
    raise HTTPException(status_code=404, detail="Conversation not found")


@router.put("/conversations/{conv_id}", response_model=Conversation)
async def update_conversation(conv_id: str, conversation: Conversation):
    """更新对话"""
    data = data_manager.read_data(settings.config_data_file)
    convs = data.get("conversations", [])

    for i, c in enumerate(convs):
        if c["id"] == conv_id:
            conversation.id = conv_id
            conversation.created_at = c.get("created_at")
            conversation.updated_at = datetime.now().isoformat()
            convs[i] = conversation.dict()
            data["conversations"] = convs
            data_manager.write_data(settings.config_data_file, data)
            return conversation

    raise HTTPException(status_code=404, detail="Conversation not found")


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    """删除对话"""
    data = data_manager.read_data(settings.config_data_file)
    convs = data.get("conversations", [])
    data["conversations"] = [c for c in convs if c["id"] != conv_id]
    data_manager.write_data(settings.config_data_file, data)
    return {"message": "Conversation deleted"}


@router.post("/conversations/{conv_id}/generate-title")
async def generate_conversation_title(conv_id: str):
    """使用 LLM 生成对话标题"""
    data = data_manager.read_data(settings.config_data_file)

    # 获取对话
    conv = None
    for c in data.get("conversations", []):
        if c["id"] == conv_id:
            conv = c
            break

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = conv.get("messages", [])
    if len(messages) < 2:
        return {"title": "New Conversation"}

    # 获取当前激活的配置
    configs = data.get("llm_configs", [])
    active_config = None
    for c in configs:
        if c.get("is_default"):
            active_config = LLMConfigProfile(**c)
            break

    if not active_config:
        raise HTTPException(status_code=400, detail="No active LLM config")

    # 构建摘要请求
    summary_messages = messages[:4]
    content_preview = "\n".join([
        f"{m['role']}: {m['content'][:100]}" for m in summary_messages
    ])

    prompt = f"""Based on this conversation, generate a short title (max 30 characters, in the same language as the conversation):

{content_preview}

Reply with ONLY the title, no quotes or explanation."""

    try:
        title = await llm_service.chat(prompt, [], active_config)
        title = title.strip().strip('"\'')[:30]

        # 更新对话标题
        for i, c in enumerate(data["conversations"]):
            if c["id"] == conv_id:
                data["conversations"][i]["title"] = title
                data["conversations"][i]["updated_at"] = datetime.now().isoformat()
                break

        data_manager.write_data(settings.config_data_file, data)
        return {"title": title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
