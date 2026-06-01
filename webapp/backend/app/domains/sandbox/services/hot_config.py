"""热配置管理 — 内存中的 YAML 配置，支持热更新"""

from typing import Dict, Optional
import yaml

from app.domains.cybercore.registry import get_game_config
from app.domains.cybercore.types import GameConfigDocument
from app.domains.cybercore.world_loader import merge_world_into_game_config


class HotConfigManager:
    """管理沙盒会话的内存配置"""

    def __init__(self):
        # session_id -> 内存中的 GameConfigDocument
        self._configs: Dict[str, GameConfigDocument] = {}
        # session_id -> 原始 YAML 文本
        self._yaml_texts: Dict[str, str] = {}

    def load_from_config_id(self, session_id: str, config_id: str) -> str:
        """从现有模板加载配置，返回 YAML 文本"""
        doc = get_game_config(config_id)
        yaml_text = self._doc_to_yaml(doc)
        self._configs[session_id] = doc
        self._yaml_texts[session_id] = yaml_text
        return yaml_text

    def load_from_yaml(self, session_id: str, yaml_text: str) -> GameConfigDocument:
        """从 YAML 文本加载配置，返回解析后的文档"""
        raw = yaml.safe_load(yaml_text)
        raw = merge_world_into_game_config(raw)
        doc = GameConfigDocument.model_validate(raw)
        self._configs[session_id] = doc
        self._yaml_texts[session_id] = yaml_text
        return doc

    def update_yaml(self, session_id: str, yaml_text: str) -> GameConfigDocument:
        """更新 YAML 文本，重新解析验证"""
        return self.load_from_yaml(session_id, yaml_text)

    def get_doc(self, session_id: str) -> Optional[GameConfigDocument]:
        return self._configs.get(session_id)

    def get_yaml(self, session_id: str) -> Optional[str]:
        return self._yaml_texts.get(session_id)

    def remove(self, session_id: str):
        self._configs.pop(session_id, None)
        self._yaml_texts.pop(session_id, None)

    @staticmethod
    def _doc_to_yaml(doc: GameConfigDocument) -> str:
        """将 GameConfigDocument 转换回 YAML 文本"""
        data = doc.model_dump()
        return yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False)

    def list_templates(self) -> list:
        """返回所有可用模板列表"""
        from app.domains.cybercore.registry import list_game_configs
        return list_game_configs()


# 全局单例
_hot_config_manager: Optional[HotConfigManager] = None


def get_hot_config_manager() -> HotConfigManager:
    global _hot_config_manager
    if _hot_config_manager is None:
        _hot_config_manager = HotConfigManager()
    return _hot_config_manager
