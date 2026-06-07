"""FIN 运行时数据模型 — 占位"""

from pydantic import BaseModel


class FINTeamState(BaseModel):
    """队伍运行时状态占位"""
    pass


class FINDecision(BaseModel):
    """决策占位"""
    pass
