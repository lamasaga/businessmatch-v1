# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**商域 (BizSim Edu)** is a K12-to-university business simulation education platform. This is a monorepo containing:

- **`webapp/`** — Main application: FastAPI backend + React dual frontend (student + organizer)
- **`TechVenture/`** — Standalone TechVenture game engine server (Express + TypeScript)
- **`art-assets/`** — Art assets (including fushengji/tabler icons)
- **`PPT/`** — Presentation files (HTML/SVG)
- **`inspire/`** — Vision/research documents (non-authoritative for implementation)
- **`docs/decisions/`** — Architecture Decision Records (ADR)

Root documents `00-PROJECT.md`, `00-TERMINOLOGY.md`, `01-PRODUCT.md`, `02-ARCHITECTURE.md`, `03-ENGINEERING.md`, `04-ROADMAP.md` are the authoritative source. **Do not treat `inspire/` as implementation authority.**

## Quick Start Commands

### Webapp (Main Application)

**One-shot launch (Windows, recommended):**
```powershell
cd webapp
.\启动.ps1
```
Starts backend (:8000) + student frontend (:5173) + organizer frontend (:5174) in separate windows.

**Manual startup:**
```powershell
# Backend (from webapp/backend/)
.\venv\Scripts\python run.py
# Or with auto-reload (Windows reload can leave orphaned processes):
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Database init (first time or after schema changes)
.\venv\Scripts\python -m app.db.init_db

# Student frontend (from webapp/frontend/)
npm install
npm run dev        # localhost:5173

# Organizer frontend (from webapp/organizer-frontend/)
npm install
npm run dev        # localhost:5174
```

**Docker (production-like):**
```powershell
cd webapp
docker compose up -d --build
# Student at http://localhost, organizer at http://localhost:5174
```

**Test accounts:** `student`/`student123`, `admin`/`admin123`

### TechVenture Server

```powershell
cd TechVenture
npm install
npm run dev        # tsx watch src/index.ts
npm run build      # tsc → dist/
npm start          # node dist/index.js
```

## High-Level Architecture

### Webapp Backend — Domain-Partitioned Monolith

The backend (`webapp/backend/app/`) is organized around **hard domain boundaries**. Cross-domain writes are forbidden — only API calls or domain events.

| Domain | Path | Owned Tables | Key Rule |
|--------|------|--------------|----------|
| **identity** | `models/user.py` · `api/auth.py` | `users` | No other domain writes `users.experience` directly |
| **arena** | `domains/arena/` · `api/{competitions,trading,organizer,practice,teaching_groups}.py` | `competition_events`, `competition_participants`, `organizer_profiles`, `arena_teams` | Game engines must not bypass arena to mutate competition state |
| **cybercore** | `domains/cybercore/` · `content/game-configs/` | YAML configs | Game rules must be declared in YAML, never hardcoded |
| **games/trading** | `games/trading/*.py` | `trading_rounds`, `trading_decisions`, `trading_prices` | Arena tables off-limits |
| **games/techventure** | `games/techventure/*.py` | `tv_team_state`, `tv_rounds`, `tv_submissions`, `tv_snapshots`, `tv_news` | Arena tables off-limits |
| **career** | `domains/career/` | `xp_events` | XP changes only through `grant_xp` / `settle_match_rewards` |
| **sandbox** | `domains/sandbox/` | — | Isolated experiment space |

**`models/trading_competition.py` is a re-export compatibility layer only.** New business logic belongs in `domains/arena/models/` or `games/<engine>/models.py`.

### Arena + Game Engine Separation

The platform separates "competition lifecycle" (arena) from "game rules" (engine):

| Layer | Identifier | Path | Responsibility |
|-------|-----------|------|----------------|
| **Engine** | YAML `engine:` | `app/games/<engine>/` | Settlement kernel, runtime tables |
| **Config ID** | `game_config_id` | `content/game-configs/<id>.yaml` | Rounds, cities, economic constants, rewards |
| **Match Kind** | `match_kind` | `ArenaMatch.match_kind` | `practice` vs `official`: entry flow, XP weight, room code control |
| **Flow** | — | `practice.py` / `competitions` / `*_admin` | Lifecycle and security, no engine logic |

Build a match: `get_game_config(game_config_id)` → `merged_match_config(overrides)` → write `match.config` snapshot.

### RTS Real-Time Architecture (FStrading)

The trading game uses a **scheduler-single-writer** pattern. HTTP endpoints are read-only; they never advance tick.

| Rule | Detail |
|------|--------|
| Tick advancement | **Only** `rts_scheduler.py` → `maybe_advance_rts` |
| HTTP `/state` | Read-only. No write/advance in GET handler |
| HTTP `/actions` | Queue commands; settled on next tick. No immediate advance |
| WS broadcast | `commit` first, then `broadcast`; never send `finished` before commit |
| Turn-based advance | Practice matches atomically advance in `practice_flow.py` (human decision + AI decision + advance in same transaction) |

### Dual Frontend Architecture

| Frontend | Path | Port | Content |
|----------|------|------|---------|
| Student | `webapp/frontend/` | :5173 | All student-facing pages; no organizer controls |
| Organizer | `webapp/organizer-frontend/` | :5174 | Independent Vite project; competition control panels |

State management: Zustand stores — `authStore`, `careerStore`(persist), `competitionStore`, `tradingStore`, `techventureStore`, `OPCStore`, `campStore`, `sandboxStore`.

`data/mockPlatform.ts` is for demo only. New features must connect to backend APIs.

### Single Database, Single API Process

- One SQLite database (`bizsim.db` or `sqlite:////app/data/bizsim.db` in Docker)
- One FastAPI process serves all clients
- Idempotent writes: `xp_events` uses `idempotency_key`
- Post-match rewards must go through `settle_match_rewards`

### Phase Gating (Current: Phase A)

The project uses phase gates. When the user does not specify, default to **Phase A** scope only:

| Phase | Can Do | Should Not Do |
|-------|--------|---------------|
| **A (current)** | Career frontend integration, formal competition controls, contracts, TechVenture engine, city planning docs | Build `domains/world/`, cross-match persistent city state, modify settlement to hook World |
| **B** | Hermes-Debrief rules, Quest service, PG migration, city master YAML | Skip rules layer for LLM Agent, build World domain tables early |
| **C~D** | LangGraph orchestration, Persona, knowledge graph | — |
| **E** | OPC LangGraph + MCP | — |

### Router Mounting

All routers mount in `app/main.py` under `/api/v1`:

```python
app.include_router(auth.router, prefix="/api/v1")
app.include_router(wiki.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(opc.router, prefix="/api/v1")
app.include_router(organizer.router, prefix="/api/v1")
app.include_router(teaching_groups.router, prefix="/api/v1")
app.include_router(competitions.router, prefix="/api/v1")
app.include_router(trading.router, prefix="/api/v1")
app.include_router(trading_ws.router, prefix="/api/v1")
app.include_router(practice.router, prefix="/api/v1")
app.include_router(techventure_api.router, prefix="/api/v1")
app.include_router(techventure_admin.router, prefix="/api/v1")
app.include_router(seasons.router, prefix="/api/v1")
app.include_router(camp_groups.router, prefix="/api/v1")
app.include_router(assignments.router, prefix="/api/v1")
app.include_router(camp_summer.router, prefix="/api/v1")
app.include_router(sandbox_router, prefix="/api/v1")
```

**Do not create new router modules without first updating `03-ENGINEERING.md` §后端 API 全表 and `main.py`.**

## TechVenture Server

A separate Express + TypeScript server that prototypes the TechVenture game engine. It is **not** the same as the FastAPI backend's `games/techventure/` engine — it exists as a standalone demo/development server.

Key files: `src/engine/v6Engine.ts` (settlement), `src/engine/config.ts` (game config), `src/routes/api.ts` (API routes), `src/services/gameService.ts` (game lifecycle).

## Documentation Authority Hierarchy

When coding, facts come from (in order):

1. **`00-PROJECT.md` / `00-TERMINOLOGY.md` / `01-PRODUCT.md` / `02-ARCHITECTURE.md` / `03-ENGINEERING.md` / `04-ROADMAP.md`** — especially `03-ENGINEERING.md` for implementation status/API tables
2. **`docs/decisions/*.md`** — "why" behind architecture choices
3. **Domain `DESIGN.md` / `ARCHITECTURE.md`** — e.g. `domains/arena/ARCHITECTURE.md`, `domains/career/DESIGN.md`
4. **Code** — `main.py`, routers, models

`inspire/` is for vision and research. It may be ahead of code. Do not implement from `inspire/` without confirming against `03-ENGINEERING.md` and phase gates.

## Cursor Rules Summary (`.cursor/rules/`)

These rules are enforced for AI coding sessions:

- **blueprint-coding.mdc**: Hard domain boundaries, router assignments, game config extension rules, RTS single-writer, single-db/single-process, dual frontend separation, phase gate constraints, coding style (Python: FastAPI+SQLAlchemy 2, functional; TypeScript: React 19+Zustand+Tailwind)
- **docs-align-before-push.mdc**: Before pushing to GitHub after large changes, align root docs `00-PROJECT.md` through `04-ROADMAP.md` with code changes; update metadata dates; ensure `03-ENGINEERING.md` AI_DEFAULT has no contradictions
- **adr-writing.mdc**: Write ADR when architecture choices (M1-M6) or new game modes (R1-R4) happen; 80-200 lines; no code pasting
- **doc-linking.mdc**: Only `agent.md`, `README.md`, `00-10` may link into `inspire/`; `inspire/` docs must not link to each other (use numbered references)
- **inspire-writing.mdc**: Narrative style for vision docs; each `##` section needs ≥1 paragraph explaining "why"; no bare bullet lists without narrative

## Key Files for Orientation

| Purpose | File |
|---------|------|
| Session entry | `CLAUDE.md` (Claude Code) · `agent.md` (other AI tools) |
| Engineering truth | `03-ENGINEERING.md` (AI_DEFAULT snapshot) |
| Domain boundaries | `.cursor/rules/blueprint-coding.mdc` |
| Arena architecture | `webapp/backend/app/domains/arena/ARCHITECTURE.md` |
| Backend entry | `webapp/backend/app/main.py` |
| Backend config | `webapp/backend/app/core/config.py` |
| Game configs | `webapp/backend/content/game-configs/*.yaml` |
| Frontend student entry | `webapp/frontend/src/App.tsx` |
| Frontend organizer entry | `webapp/organizer-frontend/src/App.tsx` |
| ADR index | `docs/decisions/README.md` |
