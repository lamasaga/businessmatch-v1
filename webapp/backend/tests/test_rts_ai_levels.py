"""RTS AI 档位逻辑烟测"""

from app.games.trading.rts_ai_levels import normalize_ai_slots, _row


def test_normalize_ai_slots_pad():
    slots = normalize_ai_slots({"practice_ai_slots": ["chaotic"]}, 3)
    assert slots == ["chaotic", "advanced", "advanced"]


def test_row_ask_bid():
    snap = {
        "jingcheng": {
            "grain": {"ask": 30, "bid": 25, "pool": 100},
        }
    }
    assert _row(snap, "jingcheng", "grain") == (30, 25)
