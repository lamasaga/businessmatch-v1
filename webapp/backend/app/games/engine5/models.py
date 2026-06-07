"""ENI5 运行时数据模型 — 占位"""

from pydantic import BaseModel


class ENI5TeamState(BaseModel):
    """队伍运行时状态占位"""
    pass


class ENI5Decision(BaseModel):
    """决策占位"""
    pass
