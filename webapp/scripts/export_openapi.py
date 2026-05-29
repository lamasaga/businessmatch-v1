#!/usr/bin/env python3
"""Export FastAPI OpenAPI schema to webapp/contracts/openapi/bundled.yaml."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
OUT_DIR = ROOT / "contracts" / "openapi"
OUT_YAML = OUT_DIR / "bundled.yaml"
OUT_JSON = OUT_DIR / "bundled.json"


def main() -> int:
    sys.path.insert(0, str(BACKEND))
    try:
        import yaml  # type: ignore
    except ImportError:
        yaml = None

    from app.main import app

    schema = app.openapi()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    OUT_JSON.write_text(
        json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if yaml is not None:
        OUT_YAML.write_text(
            yaml.dump(schema, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )
        print(f"Wrote {OUT_YAML}")
    else:
        print("PyYAML not installed; wrote JSON only.", file=sys.stderr)
        print(f"Wrote {OUT_JSON}")

    paths = schema.get("paths", {})
    print(f"Paths: {len(paths)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
