"""SQLite persistence for solver results.

Uses a separate database (data/solver.db) to avoid migration conflicts
with the main pulse.db.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS solves (
    solve_id TEXT PRIMARY KEY,
    variant TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    num_iterations INTEGER NOT NULL,
    completed_iterations INTEGER DEFAULT 0,
    ev_p0 REAL,
    exploitability REAL,
    num_info_sets INTEGER DEFAULT 0,
    config_json TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solve_id TEXT NOT NULL REFERENCES solves(solve_id) ON DELETE CASCADE,
    info_set_key TEXT NOT NULL,
    actions_json TEXT NOT NULL,
    probabilities_json TEXT NOT NULL,
    is_locked INTEGER DEFAULT 0,
    UNIQUE(solve_id, info_set_key)
);

CREATE TABLE IF NOT EXISTS node_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solve_id TEXT NOT NULL REFERENCES solves(solve_id) ON DELETE CASCADE,
    info_set_key TEXT NOT NULL,
    strategy_json TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    UNIQUE(solve_id, info_set_key)
);

CREATE INDEX IF NOT EXISTS idx_strategies_solve_id ON strategies(solve_id);
CREATE INDEX IF NOT EXISTS idx_node_locks_solve_id ON node_locks(solve_id);
"""


class SolverDatabase:
    """Async SQLite database for solver persistence."""

    def __init__(self, db_path: str | Path = "data/solver.db"):
        self.db_path = Path(db_path)
        self._conn: aiosqlite.Connection | None = None

    async def connect(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = await aiosqlite.connect(self.db_path)
        self._conn.row_factory = aiosqlite.Row
        await self._conn.executescript(SCHEMA)
        await self._conn.commit()

    async def close(self) -> None:
        if self._conn:
            await self._conn.close()
            self._conn = None

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    async def create_solve(self, solve_id: str, variant: str,
                           num_iterations: int, config: dict | None = None) -> None:
        now = self._now()
        await self._conn.execute(
            "INSERT INTO solves (solve_id, variant, status, num_iterations, "
            "config_json, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?, ?, ?)",
            (solve_id, variant, num_iterations,
             json.dumps(config) if config else None, now, now)
        )
        await self._conn.commit()

    async def update_solve_status(self, solve_id: str, status: str,
                                  ev_p0: float | None = None,
                                  exploitability: float | None = None,
                                  num_info_sets: int | None = None,
                                  completed_iterations: int | None = None,
                                  error: str | None = None) -> None:
        updates = ["status = ?", "updated_at = ?"]
        values: list = [status, self._now()]

        if ev_p0 is not None:
            updates.append("ev_p0 = ?")
            values.append(ev_p0)
        if exploitability is not None:
            updates.append("exploitability = ?")
            values.append(exploitability)
        if num_info_sets is not None:
            updates.append("num_info_sets = ?")
            values.append(num_info_sets)
        if completed_iterations is not None:
            updates.append("completed_iterations = ?")
            values.append(completed_iterations)
        if error is not None:
            updates.append("error = ?")
            values.append(error)

        values.append(solve_id)
        await self._conn.execute(
            f"UPDATE solves SET {', '.join(updates)} WHERE solve_id = ?",
            values
        )
        await self._conn.commit()

    async def get_solve(self, solve_id: str) -> dict | None:
        cursor = await self._conn.execute(
            "SELECT * FROM solves WHERE solve_id = ?", (solve_id,)
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    async def delete_solve(self, solve_id: str) -> bool:
        cursor = await self._conn.execute(
            "DELETE FROM solves WHERE solve_id = ?", (solve_id,)
        )
        await self._conn.commit()
        return cursor.rowcount > 0

    async def save_strategies(self, solve_id: str,
                              strategies: dict[str, dict]) -> None:
        """Save all strategies for a solve.

        strategies: {info_set_key: {"actions": [...], "probs": [...], "locked": bool}}
        """
        await self._conn.execute(
            "DELETE FROM strategies WHERE solve_id = ?", (solve_id,)
        )
        for key, data in strategies.items():
            await self._conn.execute(
                "INSERT INTO strategies (solve_id, info_set_key, actions_json, "
                "probabilities_json, is_locked) VALUES (?, ?, ?, ?, ?)",
                (solve_id, key,
                 json.dumps(data["actions"]),
                 json.dumps(data["probs"]),
                 1 if data.get("locked") else 0)
            )
        await self._conn.commit()

    async def get_strategies(self, solve_id: str,
                             keys: list[str] | None = None,
                             prefix: str | None = None) -> list[dict]:
        query = "SELECT * FROM strategies WHERE solve_id = ?"
        params: list = [solve_id]

        if keys:
            placeholders = ",".join("?" * len(keys))
            query += f" AND info_set_key IN ({placeholders})"
            params.extend(keys)
        elif prefix:
            query += " AND info_set_key LIKE ?"
            params.append(f"{prefix}%")

        cursor = await self._conn.execute(query, params)
        rows = await cursor.fetchall()
        return [
            {
                "info_set_key": row["info_set_key"],
                "actions": json.loads(row["actions_json"]),
                "probabilities": json.loads(row["probabilities_json"]),
                "is_locked": bool(row["is_locked"]),
            }
            for row in rows
        ]

    async def get_info_set_keys(self, solve_id: str) -> list[str]:
        cursor = await self._conn.execute(
            "SELECT info_set_key FROM strategies WHERE solve_id = ? "
            "ORDER BY info_set_key",
            (solve_id,)
        )
        rows = await cursor.fetchall()
        return [row["info_set_key"] for row in rows]

    async def save_node_lock(self, solve_id: str, info_set_key: str,
                             strategy: list[float]) -> None:
        now = self._now()
        await self._conn.execute(
            "INSERT OR REPLACE INTO node_locks (solve_id, info_set_key, "
            "strategy_json, applied_at) VALUES (?, ?, ?, ?)",
            (solve_id, info_set_key, json.dumps(strategy), now)
        )
        await self._conn.commit()
