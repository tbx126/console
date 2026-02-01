import httpx
import json
from typing import List, Dict, Any, AsyncGenerator, Optional
from app.models.ai_assistant import LLMConfigProfile, ChatMessage, ParsedData, ParsedDataType


class LLMService:
    """LLM 服务 - 统一的 LLM 调用接口"""

    def __init__(self):
        self.timeout = 60.0
        self.max_retries = 3

    async def chat(
        self,
        message: str,
        history: List[ChatMessage],
        config: LLMConfigProfile,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """发送聊天消息并获取响应"""
        messages = self._build_messages(message, history, system_prompt)
        return await self._call_deepseek(messages, config, temperature, top_p, max_tokens)

    async def chat_stream(
        self,
        message: str,
        history: List[ChatMessage],
        config: LLMConfigProfile,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """流式发送聊天消息"""
        messages = self._build_messages(message, history, system_prompt)
        async for chunk in self._stream_openai_compatible(messages, config, temperature, top_p, max_tokens):
            yield chunk

    async def chat_vision(
        self,
        message: str,
        image_base64: str,
        history: List[ChatMessage],
        config: LLMConfigProfile,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """发送带图片的聊天消息（DeepSeek 不支持）"""
        raise ValueError("Vision not supported for DeepSeek")

    def _build_messages(
        self,
        message: str,
        history: List[ChatMessage],
        custom_system_prompt: Optional[str] = None
    ) -> List[Dict[str, str]]:
        """构建消息列表"""
        # 只有当 custom_system_prompt 为 None 或空字符串时才使用默认提示词
        if custom_system_prompt is not None and custom_system_prompt.strip():
            system_content = custom_system_prompt
        else:
            system_content = self._get_system_prompt()

        print(f"[DEBUG] Using system prompt (first 100 chars): {system_content[:100]}...")

        messages = [
            {
                "role": "system",
                "content": system_content
            }
        ]

        # 添加历史消息
        for msg in history[-10:]:  # 只保留最近 10 条
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        # 添加当前消息
        messages.append({
            "role": "user",
            "content": message
        })

        return messages

    def _get_system_prompt(self) -> str:
        """获取系统提示词"""
        return """你是一个友好的 AI 助手，可以和用户自然地聊天。

格式要求：
- 使用 Markdown 格式回复
- 数学公式使用 LaTeX 语法：行内公式用 $...$ 或 \\(...\\)，块级公式用 $$...$$ 或 \\[...\\]
- 不要用反引号 ` 包裹数学公式，必须用 $ 符号
- 代码块使用 ```language 格式

当用户在对话中提到可以记录的信息时（如消费、收入、航班、投资等），请在回复末尾附上 JSON 数据，格式如下：

支持的类型：
- expense: {"data_type": "expense", "data": {"category": "分类", "amount": 金额, "merchant": "商家", "date": "YYYY-MM-DD", "notes": "备注"}}
- income: {"data_type": "income", "data": {"source": "来源", "amount": 金额, "date": "YYYY-MM-DD", "type": "类型"}}
- flight: {"data_type": "flight", "data": {"airline": "航空公司", "flight_number": "航班号", "origin": "出发地", "destination": "目的地", "date": "YYYY-MM-DD", "travel_class": "舱位"}}
- investment: {"data_type": "investment", "data": {"symbol": "代码", "quantity": 数量, "purchase_price": 价格, "date": "YYYY-MM-DD"}}

注意：
- 只有当用户明确提到具体的消费、收入、航班或投资信息时才附加 JSON
- 普通聊天不需要附加任何 JSON
- 先用自然语言回复，JSON 放在最后"""

    async def _call_deepseek(
        self,
        messages: List[Dict[str, str]],
        config: LLMConfigProfile,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> str:
        """调用 OpenAI 兼容 API"""
        base_url = (config.base_url or "https://api.deepseek.com/v1").rstrip('/')
        url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": config.model,
            "messages": messages
        }

        if temperature is not None:
            payload["temperature"] = temperature
        if top_p is not None:
            payload["top_p"] = top_p
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def _stream_openai_compatible(
        self,
        messages: List[Dict[str, str]],
        config: LLMConfigProfile,
        temperature: Optional[float] = None,
        top_p: Optional[float] = None,
        max_tokens: Optional[int] = None
    ) -> AsyncGenerator[str, None]:
        """流式调用 OpenAI 兼容 API"""
        base_url = (config.base_url or "https://api.deepseek.com/v1").rstrip('/')
        url = f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": config.model,
            "messages": messages,
            "stream": True
        }

        if temperature is not None:
            payload["temperature"] = temperature
        if top_p is not None:
            payload["top_p"] = top_p
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        print(f"[LLM DEBUG] Request URL: {url}")
        print(f"[LLM DEBUG] Model: {config.model}")
        print(f"[LLM DEBUG] Payload keys: {list(payload.keys())}")

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                print(f"[LLM DEBUG] Response status: {response.status_code}")
                if response.status_code != 200:
                    error_body = await response.aread()
                    print(f"[LLM ERROR] Status: {response.status_code}, URL: {url}, Body: {error_body.decode()}")
                    raise Exception(f"API Error: {response.status_code} - {error_body.decode()}")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                        except json.JSONDecodeError:
                            continue

    async def parse_response(self, response: str) -> ParsedData | None:
        """从响应中解析结构化数据"""
        try:
            # 查找所有可能的 JSON 起始位置
            import re
            print(f"[PARSE DEBUG] Starting parse, response length: {len(response)}")
            for match in re.finditer(r'\{', response):
                start = match.start()
                # 使用栈匹配嵌套的大括号
                stack = 0
                for i in range(start, len(response)):
                    if response[i] == '{':
                        stack += 1
                    elif response[i] == '}':
                        stack -= 1
                        if stack == 0:
                            # 找到完整的 JSON
                            json_str = response[start:i+1]
                            print(f"[PARSE DEBUG] Found JSON: {json_str}")
                            try:
                                data_dict = json.loads(json_str)
                                print(f"[PARSE DEBUG] Parsed dict: {data_dict}")
                                if "data_type" in data_dict:
                                    print(f"[PARSE DEBUG] Creating ParsedData...")
                                    result = ParsedData(**data_dict)
                                    print(f"[PARSE DEBUG] Success: {result}")
                                    return result
                            except Exception as e:
                                print(f"[PARSE DEBUG] Error: {e}")
                                continue
                            break
        except Exception as e:
            print(f"[PARSE DEBUG] Outer exception: {e}")
            pass
        print(f"[PARSE DEBUG] Returning None")
        return None


llm_service = LLMService()
