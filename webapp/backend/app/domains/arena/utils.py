"""Arena 工具函数"""

import random
import string


def generate_room_code(length: int = 4) -> str:
    return "".join(random.choices(string.digits, k=length))
