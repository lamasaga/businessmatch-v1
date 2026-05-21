"""SQLite 轻量迁移 — 为已有 bizsim.db 增补 Arena/Career 列"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _has_column(engine: Engine, table: str, column: str) -> bool:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return False
    return column in {c["name"] for c in insp.get_columns(table)}


def run_migrations(engine: Engine) -> None:
    with engine.connect() as conn:
        alters = [
            ("competition_events", "match_kind", "VARCHAR(20) DEFAULT 'official' NOT NULL"),
            ("competition_events", "design_mode", "VARCHAR(20) DEFAULT 'standalone' NOT NULL"),
            ("competition_events", "game_config_id", "VARCHAR(64) DEFAULT 'trading-v1' NOT NULL"),
            ("competition_participants", "is_ai", "INTEGER DEFAULT 0 NOT NULL"),
            ("competition_participants", "team_id", "INTEGER"),
            ("competition_participants", "team_role", "VARCHAR(32)"),
        ]
        for table, col, ddl in alters:
            if not _has_column(engine, table, col):
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
                print(f"[migrate] added {table}.{col}")
        conn.commit()
