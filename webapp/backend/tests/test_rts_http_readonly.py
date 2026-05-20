"""RTS：HTTP 只读、调度器单写者"""

import inspect


def test_build_rts_game_state_does_not_advance_tick():
    from app.api import trading_rts_handlers

    src = inspect.getsource(trading_rts_handlers.build_rts_game_state)
    assert "maybe_advance_rts" not in src


def test_organizer_control_does_not_advance_tick():
    from app.api import organizer

    src = inspect.getsource(organizer.get_event_control)
    assert "maybe_advance_rts" not in src


def test_maybe_advance_doc_scheduler_only():
    from app.games.trading import rts_tick

    doc = rts_tick.maybe_advance_rts.__doc__ or ""
    assert "scheduler" in doc.lower() or "调度" in doc
