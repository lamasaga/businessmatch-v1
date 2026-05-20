"""RTS tick 阶段与防重逻辑"""

from app.games.trading.rts_state import phase_for_tick


def test_phase_no_premature_ending():
    rt = {"total_ticks": 120, "warmup_ticks": 6}
    assert phase_for_tick(119, rt) == "running"
    assert phase_for_tick(120, rt) == "finished"


def test_phase_warmup():
    rt = {"total_ticks": 120, "warmup_ticks": 6}
    assert phase_for_tick(5, rt) == "warmup"
    assert phase_for_tick(6, rt) == "running"
