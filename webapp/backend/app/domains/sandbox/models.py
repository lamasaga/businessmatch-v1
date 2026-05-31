"""沙盒会话模型 — 纯内存对象，不写入持久数据库"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4


class SandboxRunState(str, Enum):
    idle = "idle"
    running = "running"
    paused = "paused"
    finished = "finished"


@dataclass
class SandboxSession:
    """沙盒会话：承载一场赛事的调试运行态"""

    session_id: str = field(default_factory=lambda: str(uuid4())[:8])
    config_yaml: str = ""
    config_id: Optional[str] = None          # 基于的模板 ID（如 trading-v2-rts）
    engine: str = ""                         # 引擎名称（trading / techventure / ...）
    run_state: SandboxRunState = SandboxRunState.idle
    current_step: int = 0                    # 当前 tick 或 round
    total_steps: int = 0                     # 总 tick 或 round
    step_label: str = ""                     # "tick" / "round"
    world_state: Dict[str, Any] = field(default_factory=dict)   # 引擎当前世界状态
    debug_log: List[Dict[str, Any]] = field(default_factory=list)
    run_history: List[Dict[str, Any]] = field(default_factory=list)  # 每次运行的结果摘要
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def touch(self):
        self.updated_at = datetime.now(timezone.utc)

    def reset(self):
        """重置运行状态（配置保留）"""
        self.run_state = SandboxRunState.idle
        self.current_step = 0
        self.world_state = {}
        self.debug_log = []
        self.touch()

    def to_summary(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "config_id": self.config_id,
            "engine": self.engine,
            "run_state": self.run_state.value,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "step_label": self.step_label,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
