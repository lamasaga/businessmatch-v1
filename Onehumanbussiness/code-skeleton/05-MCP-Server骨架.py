"""
OHB MCP Server 骨架
可直接复制到后端项目的 mcp_servers/ 目录
基于 Python SDK 实现 Model Context Protocol 服务器
"""

from typing import Any, Dict, List, Optional
from mcp.server.fastmcp import FastMCP, Context
import json
import asyncio

# ============ 服务器初始化 ============

# 创建 MCP 服务器实例
mcp = FastMCP("ohb-tool-suite")


# ============ 内存服务器 (ohb-memory) ============

class MemoryStore:
    """简单的内存存储（生产环境使用 ChromaDB/Redis）"""
    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}
    
    def store(self, company_id: str, key: str, value: Any) -> bool:
        if company_id not in self._data:
            self._data[company_id] = {}
        self._data[company_id][key] = {
            "value": value,
            "timestamp": asyncio.get_event_loop().time()
        }
        return True
    
    def recall(self, company_id: str, key: str) -> Optional[Dict[str, Any]]:
        return self._data.get(company_id, {}).get(key)
    
    def search(self, company_id: str, query: str) -> List[Dict[str, Any]]:
        """简单关键词搜索（生产环境使用向量搜索）"""
        results = []
        for key, data in self._data.get(company_id, {}).items():
            if query.lower() in str(data["value"]).lower():
                results.append({"key": key, **data})
        return results

memory_store = MemoryStore()


@mcp.tool()
async def store_memory(
    company_id: str,
    key: str,
    value: str,
    ctx: Context
) -> Dict[str, Any]:
    """
    存储记忆到项目上下文
    
    Args:
        company_id: 公司ID
        key: 记忆键（如 "user_research_summary"）
        value: 记忆内容
    
    Returns:
        存储结果
    """
    ctx.info(f"存储记忆: {key} (公司: {company_id})")
    
    success = memory_store.store(company_id, key, value)
    
    return {
        "success": success,
        "key": key,
        "message": f"记忆 '{key}' 已存储"
    }


@mcp.tool()
async def recall_memory(
    company_id: str,
    key: str,
    ctx: Context
) -> Dict[str, Any]:
    """
    从项目上下文中召回记忆
    
    Args:
        company_id: 公司ID
        key: 记忆键
    
    Returns:
        记忆内容
    """
    ctx.info(f"召回记忆: {key} (公司: {company_id})")
    
    result = memory_store.recall(company_id, key)
    
    if result:
        return {
            "found": True,
            "key": key,
            "value": result["value"],
            "timestamp": result["timestamp"]
        }
    
    return {
        "found": False,
        "key": key,
        "message": f"未找到记忆 '{key}'"
    }


@mcp.tool()
async def search_similar(
    company_id: str,
    query: str,
    limit: int = 5,
    ctx: Context
) -> Dict[str, Any]:
    """
    搜索相关记忆（语义搜索）
    
    Args:
        company_id: 公司ID
        query: 搜索查询
        limit: 返回结果数限制
    
    Returns:
        相关记忆列表
    """
    ctx.info(f"搜索记忆: {query} (公司: {company_id})")
    
    results = memory_store.search(company_id, query)
    
    return {
        "count": len(results),
        "results": results[:limit]
    }


# ============ 知识图谱服务器 (ohb-atlas) ============

@mcp.tool()
async def query_knowledge(
    topic: str,
    depth: int = 2,
    ctx: Context
) -> Dict[str, Any]:
    """
    查询 BizSim 知识图谱
    
    Args:
        topic: 知识主题（如 "pricing_strategy"）
        depth: 查询深度（1-3）
    
    Returns:
        知识节点和关联
    """
    ctx.info(f"查询知识图谱: {topic}, depth={depth}")
    
    # 模拟知识图谱查询（实际连接 Neo4j/图数据库）
    knowledge_data = {
        "topic": topic,
        "nodes": [
            {"id": "node_1", "name": "定价策略基础", "type": "concept"},
            {"id": "node_2", "name": "撇脂定价", "type": "strategy"},
            {"id": "node_3", "name": "渗透定价", "type": "strategy"},
        ],
        "edges": [
            {"from": "node_1", "to": "node_2", "relation": "includes"},
            {"from": "node_1", "to": "node_3", "relation": "includes"},
        ]
    }
    
    return {
        "success": True,
        "data": knowledge_data
    }


@mcp.tool()
async def unlock_node(
    student_id: str,
    node_id: str,
    ctx: Context
) -> Dict[str, Any]:
    """
    解锁知识节点（学习进度）
    
    Args:
        student_id: 学生ID
        node_id: 知识节点ID
    
    Returns:
        解锁结果
    """
    ctx.info(f"解锁节点: {node_id} (学生: {student_id})")
    
    return {
        "success": True,
        "node_id": node_id,
        "message": f"节点 {node_id} 已解锁"
    }


@mcp.tool()
async def get_learning_path(
    student_id: str,
    goal: str,
    ctx: Context
) -> Dict[str, Any]:
    """
    获取个性化学习路径
    
    Args:
        student_id: 学生ID
        goal: 学习目标
    
    Returns:
        学习路径
    """
    ctx.info(f"获取学习路径: {goal} (学生: {student_id})")
    
    path = {
        "goal": goal,
        "steps": [
            {"id": "step_1", "name": "基础概念", "estimated_time": "30min"},
            {"id": "step_2", "name": "案例分析", "estimated_time": "45min"},
            {"id": "step_3", "name": "实战练习", "estimated_time": "60min"},
        ]
    }
    
    return {
        "success": True,
        "path": path
    }


# ============ 沙箱服务器 (ohb-sandbox) ============

class SandboxExecutor:
    """沙箱执行器（生产环境使用 gVisor/Firecracker）"""
    
    async def init_project(self, company_id: str, template: str) -> str:
        """初始化项目"""
        project_id = f"proj_{company_id}_{template}"
        return project_id
    
    async def write_file(self, project_id: str, path: str, content: str) -> bool:
        """写入文件"""
        return True
    
    async def run_command(self, project_id: str, command: str) -> Dict[str, Any]:
        """运行命令"""
        return {
            "stdout": "命令输出",
            "stderr": "",
            "exit_code": 0
        }
    
    async def deploy_preview(self, project_id: str) -> str:
        """部署预览"""
        return f"https://preview.example.com/{project_id}"

sandbox_executor = SandboxExecutor()


@mcp.tool()
async def init_sandbox(
    company_id: str,
    template: str = "react-vite",
    ctx: Context
) -> Dict[str, Any]:
    """
    初始化代码沙箱项目
    
    Args:
        company_id: 公司ID
        template: 项目模板（react-vite, nextjs, python-flask）
    
    Returns:
        项目信息
    """
    ctx.info(f"初始化沙箱: {template} (公司: {company_id})")
    
    project_id = await sandbox_executor.init_project(company_id, template)
    
    return {
        "success": True,
        "project_id": project_id,
        "template": template,
        "status": "initialized"
    }


@mcp.tool()
async def write_sandbox_file(
    project_id: str,
    file_path: str,
    content: str,
    ctx: Context
) -> Dict[str, Any]:
    """
    写入文件到沙箱
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        content: 文件内容
    
    Returns:
        写入结果
    """
    ctx.info(f"写入文件: {file_path} (项目: {project_id})")
    
    success = await sandbox_executor.write_file(project_id, file_path, content)
    
    return {
        "success": success,
        "file_path": file_path,
        "message": f"文件 {file_path} 已写入"
    }


@mcp.tool()
async def run_sandbox_command(
    project_id: str,
    command: str,
    timeout: int = 30,
    ctx: Context
) -> Dict[str, Any]:
    """
    在沙箱中运行命令
    
    Args:
        project_id: 项目ID
        command: 命令（如 "npm run build"）
        timeout: 超时时间（秒）
    
    Returns:
        命令执行结果
    """
    ctx.info(f"运行命令: {command} (项目: {project_id})")
    
    result = await sandbox_executor.run_command(project_id, command)
    
    return {
        "success": result["exit_code"] == 0,
        "stdout": result["stdout"],
        "stderr": result["stderr"],
        "exit_code": result["exit_code"]
    }


@mcp.tool()
async def deploy_preview(
    project_id: str,
    ctx: Context
) -> Dict[str, Any]:
    """
    部署沙箱预览
    
    Args:
        project_id: 项目ID
    
    Returns:
        预览链接
    """
    ctx.info(f"部署预览: {project_id}")
    
    preview_url = await sandbox_executor.deploy_preview(project_id)
    
    return {
        "success": True,
        "preview_url": preview_url,
        "message": "预览已部署"
    }


# ============ 部署服务器 (ohb-deploy) ============

@mcp.tool()
async def deploy_production(
    project_id: str,
    platform: str = "vercel",
    env_vars: Optional[Dict[str, str]] = None,
    ctx: Context
) -> Dict[str, Any]:
    """
    部署到生产环境
    
    Args:
        project_id: 项目ID
        platform: 部署平台（vercel, netlify, aws）
        env_vars: 环境变量
    
    Returns:
        部署结果
    """
    ctx.info(f"部署生产: {project_id} -> {platform}")
    
    # 模拟部署过程
    return {
        "success": True,
        "deployment_url": f"https://{project_id}.vercel.app",
        "platform": platform,
        "status": "deployed"
    }


@mcp.tool()
async def check_deployment_status(
    deployment_id: str,
    ctx: Context
) -> Dict[str, Any]:
    """
    检查部署状态
    
    Args:
        deployment_id: 部署ID
    
    Returns:
        部署状态
    """
    ctx.info(f"检查部署状态: {deployment_id}")
    
    return {
        "deployment_id": deployment_id,
        "status": "ready",
        "url": f"https://example.com/{deployment_id}"
    }


# ============ 工具权限系统 ============

TOOL_PERMISSIONS = {
    "strategist": ["query_knowledge", "get_learning_path"],
    "worker": ["init_sandbox", "write_sandbox_file", "run_sandbox_command"],
    "advisor": ["store_memory", "recall_memory", "search_similar"],
    "scout": ["query_knowledge", "search_similar"],
}


def check_tool_permission(role: str, tool_name: str) -> bool:
    """
    检查角色是否有权限使用工具
    
    Args:
        role: 角色类型
        tool_name: 工具名称
    
    Returns:
        是否有权限
    """
    allowed_tools = TOOL_PERMISSIONS.get(role, [])
    
    # 所有角色都可以使用基础工具
    base_tools = ["store_memory", "recall_memory"]
    
    return tool_name in allowed_tools or tool_name in base_tools


# ============ 服务器运行 ============

async def run_mcp_server():
    """运行 MCP 服务器"""
    # stdio 传输（本地开发）
    await mcp.run_stdio_async()
    
    # HTTP 传输（生产环境）
    # await mcp.run_http_async(host="0.0.0.0", port=8080)


if __name__ == "__main__":
    asyncio.run(run_mcp_server())
