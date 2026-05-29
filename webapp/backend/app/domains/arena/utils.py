"""Arena 工具函数"""

import random
import string


def generate_room_code(length: int = 4) -> str:
    return "".join(random.choices(string.digits, k=length))


def generate_group_invite_code(length: int = 6) -> str:
    """营团邀请码：大写字母+数字，与 4 位纯数字房间码区分"""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=length))
