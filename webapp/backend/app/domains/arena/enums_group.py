"""体验营 / 营团枚举"""

import enum


class TeachingGroupStatus(str, enum.Enum):
    active = "active"
    closed = "closed"


class GroupMembershipRole(str, enum.Enum):
    student = "student"
    assistant = "assistant"
