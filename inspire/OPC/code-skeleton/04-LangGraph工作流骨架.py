"""
OPC LangGraph 工作流骨架
可直接复制到后端项目的 workflows/ 目录
"""

from typing import TypedDict, Annotated, Any, Optional, List, Dict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
import json

# ============ 状态定义 ============

class WorkflowState(TypedDict):
    """工作流共享状态"""
    task_id: str
    company_id: str
    assignee_id: str
    task_type: str
    requirements: Dict[str, Any]
    context: Dict[str, Any]
    
    # 中间产物
    deliverables: List[Dict[str, Any]]
    mcp_calls: List[Dict[str, Any]]
    execution_logs: List[str]
    
    # 决策状态
    needs_review: bool
    student_approved: Optional[bool]
    iteration_count: int
    max_iterations: int
    
    # 最终输出
    final_output: Optional[str]
    is_complete: bool


# ============ MCP 客户端 (模拟) ============

class MCPClient:
    """MCP 工具调用客户端"""
    
    async def call(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """调用 MCP 工具"""
        return {
            "tool": tool_name,
            "params": params,
            "result": "mock_result",
            "status": "success"
        }

mcp_client = MCPClient()


# ============ 节点函数 ============

async def analyze_task(state: WorkflowState, config: RunnableConfig) -> WorkflowState:
    """
    节点1: 任务分析
    理解任务需求，制定执行计划
    """
    requirements = state["requirements"]
    task_type = state["task_type"]
    
    logs = state.get("execution_logs", [])
    logs.append(f"[分析] 任务类型: {task_type}")
    
    # 构建分析消息
    messages = [
        SystemMessage(content="你是一个任务分析专家。请分析任务需求并制定执行计划。"),
        HumanMessage(content=json.dumps(requirements, ensure_ascii=False))
    ]
    
    # 实际使用时调用 LLM
    # analysis = await llm.ainvoke(messages)
    
    # 模拟分析结果
    execution_plan = {
        "steps": ["research", "design", "implement", "review"],
        "estimated_time": 30,
        "tools_needed": ["search", "atlas_query", "code_gen"]
    }
    
    state["context"]["execution_plan"] = execution_plan
    state["execution_logs"] = logs
    state["iteration_count"] = 0
    
    return state


async def execute_mcp_tools(state: WorkflowState, config: RunnableConfig) -> WorkflowState:
    """
    节点2: 执行 MCP 工具
    调用外部工具完成任务
    """
    plan = state["context"].get("execution_plan", {})
    tools_needed = plan.get("tools_needed", [])
    
    logs = state.get("execution_logs", [])
    mcp_calls = state.get("mcp_calls", [])
    
    for tool_name in tools_needed:
        logs.append(f"[工具] 调用: {tool_name}")
        
        # 调用 MCP 工具
        result = await mcp_client.call(tool_name, {
            "task_id": state["task_id"],
            "context": state["context"]
        })
        
        mcp_calls.append(result)
        logs.append(f"[工具] {tool_name} 返回状态: {result['status']}")
    
    state["mcp_calls"] = mcp_calls
    state["execution_logs"] = logs
    
    return state


async def generate_deliverable(state: WorkflowState, config: RunnableConfig) -> WorkflowState:
    """
    节点3: 生成交付物
    根据工具执行结果生成最终交付物
    """
    mcp_results = state.get("mcp_calls", [])
    task_type = state["task_type"]
    
    logs = state.get("execution_logs", [])
    logs.append(f"[生成] 任务类型: {task_type}, 工具结果数: {len(mcp_results)}")
    
    # 根据任务类型生成不同交付物
    deliverable = {
        "type": task_type,
        "content": f"基于 {len(mcp_results)} 个工具调用生成的交付物",
        "metadata": {
            "tools_used": [c["tool"] for c in mcp_results],
            "confidence": 0.85
        }
    }
    
    state["deliverables"] = [deliverable]
    state["execution_logs"] = logs
    state["needs_review"] = True
    
    return state


async def student_review(state: WorkflowState, config: RunnableConfig) -> WorkflowState:
    """
    节点4: 学生审核
    等待学生审批（中断点）
    """
    logs = state.get("execution_logs", [])
    logs.append("[审核] 等待学生审批...")
    
    state["execution_logs"] = logs
    
    # 如果已审批，标记完成
    if state.get("student_approved") is True:
        state["is_complete"] = True
        state["final_output"] = state["deliverables"][0]["content"] if state["deliverables"] else ""
    
    return state


async def refine_deliverable(state: WorkflowState, config: RunnableConfig) -> WorkflowState:
    """
    节点5: 优化交付物
    根据反馈优化交付物
    """
    iteration = state.get("iteration_count", 0)
    iteration += 1
    
    logs = state.get("execution_logs", [])
    logs.append(f"[优化] 第 {iteration} 次迭代")
    
    # 检查是否超过最大迭代次数
    if iteration >= state.get("max_iterations", 3):
        logs.append("[优化] 达到最大迭代次数，结束任务")
        state["is_complete"] = True
    
    state["iteration_count"] = iteration
    state["execution_logs"] = logs
    state["student_approved"] = None  # 重置审批状态
    
    return state


# ============ 条件路由函数 ============

def route_after_generate(state: WorkflowState) -> str:
    """生成交付物后路由"""
    if state.get("needs_review"):
        return "student_review"
    return "end"


def route_after_review(state: WorkflowState) -> str:
    """学生审核后路由"""
    if state.get("student_approved") is True:
        return "end"
    elif state.get("student_approved") is False:
        return "refine"
    return "student_review"  # 继续等待


def route_after_refine(state: WorkflowState) -> str:
    """优化后路由"""
    if state.get("is_complete"):
        return "end"
    return "generate"


# ============ 构建工作流图 ============

def build_workflow() -> StateGraph:
    """构建 OPC 任务执行工作流"""
    
    # 创建状态图
    workflow = StateGraph(WorkflowState)
    
    # 添加节点
    workflow.add_node("analyze", analyze_task)
    workflow.add_node("execute_tools", execute_mcp_tools)
    workflow.add_node("generate", generate_deliverable)
    workflow.add_node("student_review", student_review)
    workflow.add_node("refine", refine_deliverable)
    workflow.add_node("end", lambda state: state)  # 终止节点
    
    # 设置入口点
    workflow.set_entry_point("analyze")
    
    # 添加边
    workflow.add_edge("analyze", "execute_tools")
    workflow.add_edge("execute_tools", "generate")
    
    # 条件边：生成 -> 审核/终止
    workflow.add_conditional_edges(
        "generate",
        route_after_generate,
        {
            "student_review": "student_review",
            "end": "end"
        }
    )
    
    # 条件边：审核 -> 终止/优化
    workflow.add_conditional_edges(
        "student_review",
        route_after_review,
        {
            "end": "end",
            "refine": "refine",
            "student_review": "student_review"
        }
    )
    
    # 条件边：优化 -> 生成/终止
    workflow.add_conditional_edges(
        "refine",
        route_after_refine,
        {
            "end": "end",
            "generate": "generate"
        }
    )
    
    return workflow


# ============ 工作流编译与运行 ============

def compile_workflow():
    """编译工作流（带检查点）"""
    workflow = build_workflow()
    
    # 添加内存检查点（生产环境使用持久化检查点）
    checkpointer = MemorySaver()
    
    # 编译
    app = workflow.compile(checkpointer=checkpointer)
    
    return app


# ============ 使用示例 ============

async def run_task_workflow(task_data: Dict[str, Any]):
    """
    运行任务工作流示例
    """
    app = compile_workflow()
    
    # 初始化状态
    initial_state: WorkflowState = {
        "task_id": task_data["task_id"],
        "company_id": task_data["company_id"],
        "assignee_id": task_data["assignee_id"],
        "task_type": task_data["task_type"],
        "requirements": task_data["requirements"],
        "context": {},
        "deliverables": [],
        "mcp_calls": [],
        "execution_logs": [],
        "needs_review": False,
        "student_approved": None,
        "iteration_count": 0,
        "max_iterations": 3,
        "final_output": None,
        "is_complete": False,
    }
    
    # 运行工作流
    config = RunnableConfig(
        recursion_limit=50,
        configurable={"thread_id": task_data["task_id"]}
    )
    
    # 运行到中断点（学生审核）
    result = await app.ainvoke(initial_state, config)
    
    return result


# ============ 扩展：多智能体协作工作流 ============

class MultiAgentState(TypedDict):
    """多智能体协作状态"""
    task_id: str
    company_id: str
    
    # 各智能体状态
    strategist_output: Optional[str]
    worker_outputs: List[Dict[str, Any]]
    advisor_feedback: Optional[str]
    scout_research: Optional[str]
    
    # 整合状态
    integration: Optional[str]
    final_review: Optional[str]
    is_complete: bool


async def strategist_node(state: MultiAgentState, config: RunnableConfig) -> MultiAgentState:
    """策略师节点"""
    state["strategist_output"] = "策略分析与执行计划"
    return state


async def worker_node(state: MultiAgentState, config: RunnableConfig) -> MultiAgentState:
    """执行者节点"""
    state["worker_outputs"] = [{"task": "执行结果"}]
    return state


async def advisor_node(state: MultiAgentState, config: RunnableConfig) -> MultiAgentState:
    """顾问节点"""
    state["advisor_feedback"] = "审核反馈与建议"
    return state


async def integration_node(state: MultiAgentState, config: RunnableConfig) -> MultiAgentState:
    """整合节点"""
    state["integration"] = "整合所有输出"
    state["is_complete"] = True
    return state


def build_multi_agent_workflow() -> StateGraph:
    """构建多智能体协作工作流"""
    
    workflow = StateGraph(MultiAgentState)
    
    # 并行执行策略师、执行者、侦察员
    workflow.add_node("strategist", strategist_node)
    workflow.add_node("worker", worker_node)
    workflow.add_node("advisor", advisor_node)
    workflow.add_node("integration", integration_node)
    
    workflow.set_entry_point("strategist")
    
    # 策略师 -> 执行者
    workflow.add_edge("strategist", "worker")
    # 执行者 -> 顾问审核
    workflow.add_edge("worker", "advisor")
    # 顾问 -> 整合
    workflow.add_edge("advisor", "integration")
    # 整合 -> 终止
    workflow.add_edge("integration", END)
    
    return workflow
