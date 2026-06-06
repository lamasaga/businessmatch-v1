"""
赛事引擎匣子 HTTP 客户端。
平台通过此模块调用独立引擎匣子的 API。
"""

import os
from typing import Any, Optional
import httpx
from functools import lru_cache


# ─── Configuration ───────────────────────────────────────────────────

class EngineEndpoints:
    """从环境变量读取各引擎端点。"""

    @staticmethod
    def _get(key: str, default: str = "") -> str:
        return os.getenv(key, default)

    @classmethod
    def get(cls, engine_id: str) -> str:
        """
        获取指定引擎的 endpoint。
        优先从 ENGINE_<ENGINE_ID_UPPER>_ENDPOINT 读取。
        """
        env_key = f"ENGINE_{engine_id.upper().replace('-', '_')}_ENDPOINT"
        endpoint = cls._get(env_key)
        if endpoint:
            return endpoint.rstrip("/")

        # Fallback: 通用 ENGINE_ENDPOINT
        generic = cls._get("ENGINE_ENDPOINT", "")
        if generic:
            return f"{generic.rstrip('/')}/{engine_id}"

        return ""

    @classmethod
    def all_registered(cls) -> dict[str, str]:
        """返回所有已配置引擎的 endpoint 映射。"""
        result = {}
        for key, value in os.environ.items():
            if key.startswith("ENGINE_") and key.endswith("_ENDPOINT") and key != "ENGINE_ENDPOINT":
                engine_id = key[7:-9].lower().replace("_", "-")
                result[engine_id] = value.rstrip("/")
        return result


# ─── HTTP Client Singleton ───────────────────────────────────────────

_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            headers={"Content-Type": "application/json"},
        )
    return _http_client


async def close_http_client():
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None


# ─── Engine Client ───────────────────────────────────────────────────

class EngineClient:
    """
    赛事引擎匣子的 HTTP 调用封装。
    每个引擎实例对应一个引擎 endpoint。
    """

    def __init__(self, endpoint: str, engine_token: str = ""):
        self.endpoint = endpoint.rstrip("/")
        self.engine_token = engine_token or os.getenv("ENGINE_TOKEN", "")
        self._client = get_http_client()

    def _headers(self) -> dict[str, str]:
        headers = {}
        if self.engine_token:
            headers["X-Engine-Token"] = self.engine_token
        return headers

    # ─── Lifecycle ───────────────────────────────────────────────────

    async def create_match(self, payload: dict[str, Any]) -> dict[str, Any]:
        """POST /match/create"""
        resp = await self._client.post(
            f"{self.endpoint}/match/create",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def join_match(self, match_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """POST /match/{match_id}/join"""
        resp = await self._client.post(
            f"{self.endpoint}/match/{match_id}/join",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def start_match(self, match_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """POST /match/{match_id}/start"""
        resp = await self._client.post(
            f"{self.endpoint}/match/{match_id}/start",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def advance_match(self, match_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """POST /match/{match_id}/advance"""
        resp = await self._client.post(
            f"{self.endpoint}/match/{match_id}/advance",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def finish_match(self, match_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """POST /match/{match_id}/finish"""
        resp = await self._client.post(
            f"{self.endpoint}/match/{match_id}/finish",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    # ─── State (read-only) ───────────────────────────────────────────

    async def get_match_state(self, match_id: str) -> dict[str, Any]:
        """GET /match/{match_id}/state"""
        resp = await self._client.get(
            f"{self.endpoint}/match/{match_id}/state",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def get_player_state(self, match_id: str, player_id: str) -> dict[str, Any]:
        """GET /match/{match_id}/player/{player_id}/state"""
        resp = await self._client.get(
            f"{self.endpoint}/match/{match_id}/player/{player_id}/state",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    # ─── Decision ────────────────────────────────────────────────────

    async def submit_decision(self, match_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """POST /match/{match_id}/decision"""
        resp = await self._client.post(
            f"{self.endpoint}/match/{match_id}/decision",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    # ─── Admin ───────────────────────────────────────────────────────

    async def pause_match(self, match_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self.endpoint}/match/{match_id}/admin/pause",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    async def resume_match(self, match_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        resp = await self._client.post(
            f"{self.endpoint}/match/{match_id}/admin/resume",
            json=payload,
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()

    # ─── Result ──────────────────────────────────────────────────────

    async def get_result(self, match_id: str) -> dict[str, Any]:
        """GET /match/{match_id}/result"""
        resp = await self._client.get(
            f"{self.endpoint}/match/{match_id}/result",
            headers=self._headers(),
        )
        resp.raise_for_status()
        return resp.json()


# ─── Client Factory ──────────────────────────────────────────────────

@lru_cache()
def get_engine_client(engine_id: str) -> Optional[EngineClient]:
    """
    获取指定引擎的客户端。
    如果该引擎未配置 endpoint，返回 None（回退到内置引擎）。
    """
    endpoint = EngineEndpoints.get(engine_id)
    if not endpoint:
        return None
    return EngineClient(endpoint)


def get_engine_client_for_config(game_config_id: str) -> Optional[EngineClient]:
    """
    根据 game_config_id 推断引擎 ID 并返回客户端。
    例如 "techventure-v1" → engine_id "techventure"
    """
    # 简单规则：取第一个 - 之前的部分作为引擎 ID
    engine_id = game_config_id.split("-")[0]
    return get_engine_client(engine_id)
