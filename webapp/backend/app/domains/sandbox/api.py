"""沙盒 API — 赛事设计、调试与发布"""

from typing import Dict, List, Optional
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.core.response import ApiResponse, BusinessException, ErrorCode
from app.domains.sandbox.models import SandboxRunState, SandboxSession
from app.domains.sandbox.services.hot_config import get_hot_config_manager
from app.domains.sandbox.services.runner import SandboxRunner
from app.domains.cybercore.registry import list_game_configs

router = APIRouter(prefix="/sandbox", tags=["赛事工坊"])

# ========== 内存会话存储（生产环境应考虑 Redis / 定期清理） ==========
_sessions: Dict[str, SandboxSession] = {}
_runners: Dict[str, SandboxRunner] = {}


def _get_session(session_id: str) -> SandboxSession:
    if session_id not in _sessions:
        raise BusinessException(
            message="沙盒会话不存在",
            code=ErrorCode.NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return _sessions[session_id]


def _get_or_create_runner(session_id: str) -> SandboxRunner:
    if session_id not in _runners:
        session = _get_session(session_id)
        _runners[session_id] = SandboxRunner(session)
    return _runners[session_id]


# ========== 请求/响应模型 ==========

class CreateSessionRequest(BaseModel):
    config_id: Optional[str] = None      # 基于的模板（如 trading-v2-rts）
    config_yaml: Optional[str] = None    # 直接传入 YAML 文本
    title: Optional[str] = "未命名赛事"


class UpdateConfigRequest(BaseModel):
    config_yaml: str


class PublishRequest(BaseModel):
    config_id: str                       # 发布后的 game_config_id
    version: str = "1.0.0"


# ========== API 路由 ==========

@router.get("/templates", response_model=ApiResponse[list])
def list_templates():
    """获取所有可用赛事模板"""
    mgr = get_hot_config_manager()
    return ApiResponse.ok(data=mgr.list_templates())


@router.post("/sessions", response_model=ApiResponse[dict], status_code=status.HTTP_201_CREATED)
def create_session(data: CreateSessionRequest):
    """创建沙盒会话"""
    mgr = get_hot_config_manager()
    session = SandboxSession()

    if data.config_yaml:
        # 从 YAML 文本加载
        doc = mgr.load_from_yaml(session.session_id, data.config_yaml)
        session.config_yaml = data.config_yaml
        session.engine = doc.engine
    elif data.config_id:
        # 从现有模板加载
        yaml_text = mgr.load_from_config_id(session.session_id, data.config_id)
        session.config_yaml = yaml_text
        session.config_id = data.config_id
        doc = mgr.get_doc(session.session_id)
        session.engine = doc.engine if doc else ""
    else:
        raise BusinessException(
            message="请提供 config_id 或 config_yaml",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    _sessions[session.session_id] = session

    # 初始化运行器
    runner = SandboxRunner(session)
    runner.setup(doc)
    _runners[session.session_id] = runner

    return ApiResponse.ok(data={
        "session_id": session.session_id,
        "config_id": session.config_id,
        "engine": session.engine,
        "config_yaml": session.config_yaml,
        "summary": session.to_summary(),
    })


@router.get("/sessions/{session_id}", response_model=ApiResponse[dict])
def get_session(session_id: str):
    """获取沙盒会话状态"""
    session = _get_session(session_id)
    return ApiResponse.ok(data={
        "summary": session.to_summary(),
        "world_state": _safe_world_state(session.world_state),
    })


@router.put("/sessions/{session_id}/config", response_model=ApiResponse[dict])
def update_config(session_id: str, data: UpdateConfigRequest):
    """更新配置（热重载，运行状态自动重置）"""
    session = _get_session(session_id)
    mgr = get_hot_config_manager()

    try:
        doc = mgr.update_yaml(session_id, data.config_yaml)
    except Exception as e:
        raise BusinessException(
            message=f"YAML 解析错误: {str(e)}",
            code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    session.config_yaml = data.config_yaml
    session.engine = doc.engine
    session.config_id = None  # 自定义配置不再绑定模板
    session.reset()

    # 重新初始化运行器
    runner = SandboxRunner(session)
    runner.setup(doc)
    _runners[session_id] = runner

    return ApiResponse.ok(data={
        "session_id": session_id,
        "engine": session.engine,
        "summary": session.to_summary(),
    })


@router.post("/sessions/{session_id}/start", response_model=ApiResponse[dict])
def start_run(session_id: str):
    """开始自动运行"""
    runner = _get_or_create_runner(session_id)
    result = runner.start()
    return ApiResponse.ok(data=result)


@router.post("/sessions/{session_id}/step", response_model=ApiResponse[dict])
def step_run(session_id: str):
    """单步推进"""
    runner = _get_or_create_runner(session_id)
    result = runner.step()
    return ApiResponse.ok(data=result)


@router.post("/sessions/{session_id}/pause", response_model=ApiResponse[dict])
def pause_run(session_id: str):
    """暂停运行"""
    runner = _get_or_create_runner(session_id)
    result = runner.pause()
    return ApiResponse.ok(data=result)


@router.post("/sessions/{session_id}/reset", response_model=ApiResponse[dict])
def reset_run(session_id: str):
    """重置运行状态（配置保留）"""
    session = _get_session(session_id)
    session.reset()

    # 用当前配置重新初始化
    mgr = get_hot_config_manager()
    doc = mgr.get_doc(session_id)
    if doc:
        runner = SandboxRunner(session)
        runner.setup(doc)
        _runners[session_id] = runner

    return ApiResponse.ok(data={
        "session_id": session_id,
        "summary": session.to_summary(),
    })


@router.get("/sessions/{session_id}/debug", response_model=ApiResponse[dict])
def get_debug_data(session_id: str, step_type: Optional[str] = None):
    """获取调试数据"""
    runner = _get_or_create_runner(session_id)
    logs = runner.debug.get_logs(step_type)
    return ApiResponse.ok(data={
        "logs": logs,
        "summary": runner.debug.get_summary(),
        "total_logs": len(logs),
    })


@router.get("/sessions/{session_id}/state", response_model=ApiResponse[dict])
def get_world_state(session_id: str):
    """获取当前世界状态"""
    session = _get_session(session_id)
    return ApiResponse.ok(data=_safe_world_state(session.world_state))


@router.post("/sessions/{session_id}/publish", response_model=ApiResponse[dict])
def publish_config(session_id: str, data: PublishRequest):
    """发布为正式配置（写入 content/game-configs/）"""
    session = _get_session(session_id)
    mgr = get_hot_config_manager()
    yaml_text = mgr.get_yaml(session_id)

    if not yaml_text:
        raise BusinessException(
            message="会话没有配置内容",
            code=ErrorCode.BAD_REQUEST,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 写入文件
    import yaml
    from pathlib import Path

    config_dir = Path(__file__).resolve().parents[3] / "content" / "game-configs"
    config_dir.mkdir(parents=True, exist_ok=True)

    file_path = config_dir / f"{data.config_id}.yaml"

    # 验证 YAML 格式
    try:
        parsed = yaml.safe_load(yaml_text)
        parsed["id"] = data.config_id
        parsed["version"] = data.version
        # 写回时更新 id 和 version
        yaml_text = yaml.dump(parsed, allow_unicode=True, sort_keys=False, default_flow_style=False)
    except Exception as e:
        raise BusinessException(
            message=f"YAML 格式错误: {str(e)}",
            code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    file_path.write_text(yaml_text, encoding="utf-8")

    # 清除缓存，让 registry 重新加载
    from app.domains.cybercore.registry import get_game_config
    get_game_config.cache_clear()

    return ApiResponse.ok(data={
        "config_id": data.config_id,
        "version": data.version,
        "file_path": str(file_path),
        "message": f"配置已发布为 {data.config_id}.yaml，刷新页面即可在正式环境中使用",
    })


@router.delete("/sessions/{session_id}", response_model=ApiResponse[dict])
def delete_session(session_id: str):
    """删除沙盒会话"""
    if session_id in _sessions:
        del _sessions[session_id]
    if session_id in _runners:
        del _runners[session_id]

    mgr = get_hot_config_manager()
    mgr.remove(session_id)

    return ApiResponse.ok(data={"session_id": session_id, "message": "会话已删除"})


@router.get("/sessions", response_model=ApiResponse[list])
def list_sessions():
    """列出所有沙盒会话"""
    return ApiResponse.ok(data=[
        session.to_summary() for session in _sessions.values()
    ])


# ========== 辅助函数 ==========

def _safe_world_state(ws: dict) -> dict:
    """返回安全的世界状态（去除过大或不必要的数据）"""
    if not ws:
        return {}

    return {
        "mode": ws.get("mode"),
        "phase": ws.get("phase"),
        "current_step": ws.get("current_tick") or ws.get("current_round", 0),
        "prices": ws.get("prices", {}),
        "cities_order": ws.get("cities_order", []),
        "products": list(ws.get("products", {}).keys()),
        "participants_count": len(ws.get("participants", [])),
        "player": {
            "name": ws.get("player", {}).get("name"),
            "cash": ws.get("player", {}).get("cash"),
            "total_assets": ws.get("player", {}).get("total_assets"),
            "city": ws.get("player", {}).get("city"),
        } if ws.get("player") else None,
        "standings": ws.get("standings", []),
        "history_length": len(ws.get("history", [])),
    }
