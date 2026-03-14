"""Solver manager — async job orchestration for CFR solves.

Runs CPU-bound solves in a thread pool executor to keep FastAPI responsive.
Maintains an in-memory cache of solved game trees for instant node locking.

Includes crash protection:
- Timeouts for tree building and solving
- Tree complexity limits for NLHE
- Graceful error handling with status feedback

NLHE variant uses high-performance C++ solver when available.
"""

from __future__ import annotations

import asyncio
import logging
import os
import signal
import uuid
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dataclasses import dataclass, field
from functools import partial
from typing import Any, Optional

from .best_response import compute_ev_comparison
from .cfr import CFRPlusSolver
from .game_tree import GameNode
from .info_set import InfoSetStore
from .models import GameVariant, SolveStatus
from .node_lock import NodeLocker, NodeLockSpec
from .storage import SolverDatabase

# Try to import C++ solver
try:
    from .nlhe_cpp import NLHECppSolver, NLHECppConfig, is_cpp_available
    CPP_SOLVER_AVAILABLE = is_cpp_available()
except ImportError:
    CPP_SOLVER_AVAILABLE = False
    NLHECppSolver = None
    NLHECppConfig = None

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

# Timeouts in seconds (only protection mechanism)
TREE_BUILD_TIMEOUT = 120
SOLVE_TIMEOUT = 120
EXPLOITABILITY_TIMEOUT = 120


@dataclass
class SolverState:
    """In-memory state for an active solve."""
    solve_id: str
    variant: GameVariant
    root: GameNode | None  # None for C++ solver
    info_store: InfoSetStore | None  # None for C++ solver
    solver: CFRPlusSolver | None  # None for C++ solver
    locker: NodeLocker | None  # None for C++ solver
    status: SolveStatus = SolveStatus.PENDING
    target_iterations: int = 1000
    completed_iterations: int = 0
    task: asyncio.Task | None = field(default=None, repr=False)
    action_labels: dict[str, list[str]] = field(default_factory=dict)
    error_message: str | None = None
    # C++ solver state (for NLHE)
    cpp_solver: Any = field(default=None, repr=False)
    cpp_config: Any = field(default=None, repr=False)
    ev_p0: float | None = None
    exploitability: float | None = None


class SolverManager:
    """Manages solver lifecycle: creation, execution, caching, persistence."""

    def __init__(self, db_path: str = "data/solver.db", max_workers: int = 2):
        self.db = SolverDatabase(db_path)
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._solvers: dict[str, SolverState] = {}
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        await self.db.connect()
        logger.info("SolverManager started with crash protection enabled")

    async def stop(self) -> None:
        # Cancel running tasks
        for state in self._solvers.values():
            if state.task and not state.task.done():
                state.task.cancel()
        self._executor.shutdown(wait=False)
        await self.db.close()
        logger.info("SolverManager stopped")

    def _build_tree(self, variant: GameVariant,
                    config: dict | None = None) -> tuple[GameNode, dict[str, list[str]]]:
        """Build game tree for the given variant. Returns (root, action_labels)."""
        if variant == GameVariant.KUHN:
            from .variants.kuhn import KuhnTreeBuilder
            builder = KuhnTreeBuilder()
        elif variant == GameVariant.LEDUC:
            from .variants.leduc import LeducTreeBuilder
            builder = LeducTreeBuilder()
        elif variant == GameVariant.NLHE_SUBGAME:
            from .variants.nlhe_subgame import NLHESubgameBuilder
            builder = NLHESubgameBuilder(**(config or {}))
        else:
            raise ValueError(f"Unknown variant: {variant}")

        root = builder.build_tree()

        # Collect action labels from the tree
        action_labels = _collect_action_labels(root)
        return root, action_labels

    async def create_solve(self, variant: GameVariant, num_iterations: int = 1000,
                           config: dict | None = None) -> str:
        """Create and start a new solve. Returns solve_id."""
        solve_id = str(uuid.uuid4())[:8]
        loop = asyncio.get_event_loop()

        # Use C++ solver for NLHE if available
        if variant == GameVariant.NLHE_SUBGAME and CPP_SOLVER_AVAILABLE:
            return await self._create_cpp_solve(solve_id, num_iterations, config)

        # Build tree with timeout (in executor to not block event loop)
        try:
            logger.info("Building tree for %s solve %s...", variant.value, solve_id)
            root, action_labels = await asyncio.wait_for(
                loop.run_in_executor(
                    self._executor,
                    partial(self._build_tree, variant, config)
                ),
                timeout=TREE_BUILD_TIMEOUT
            )
            logger.info("Tree built: %d info sets", len(action_labels))
        except asyncio.TimeoutError:
            error_msg = f"Tree building timed out after {TREE_BUILD_TIMEOUT}s (config too complex)"
            logger.error(error_msg)
            # Save failed solve to DB
            await self.db.create_solve(solve_id, variant.value, num_iterations, config)
            await self.db.update_solve_status(solve_id, "failed", error=error_msg)
            raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"Tree building failed: {str(e)}"
            logger.exception(error_msg)
            await self.db.create_solve(solve_id, variant.value, num_iterations, config)
            await self.db.update_solve_status(solve_id, "failed", error=error_msg)
            raise ValueError(error_msg)

        info_store = InfoSetStore()
        solver = CFRPlusSolver(root, info_store)
        locker = NodeLocker(info_store)

        state = SolverState(
            solve_id=solve_id,
            variant=variant,
            root=root,
            info_store=info_store,
            solver=solver,
            locker=locker,
            target_iterations=num_iterations,
            action_labels=action_labels,
        )

        async with self._lock:
            self._solvers[solve_id] = state

        # Persist
        await self.db.create_solve(solve_id, variant.value, num_iterations, config)

        # On Vercel serverless, run synchronously within the request
        if os.environ.get("VERCEL"):
            await self._run_solve(state)
        else:
            state.task = asyncio.create_task(
                self._run_solve(state)
            )

        return solve_id

    async def _create_cpp_solve(self, solve_id: str, num_iterations: int,
                                 config: dict | None) -> str:
        """Create and start a C++ NLHE solve."""
        config = config or {}
        loop = asyncio.get_event_loop()

        logger.info("Creating C++ NLHE solve %s...", solve_id)

        try:
            # Create C++ config
            cpp_config = NLHECppConfig(
                board=config.get("board", ""),
                range_p0=config.get("range_p0", ""),
                range_p1=config.get("range_p1", ""),
                pot=config.get("pot", 100.0),
                stack=config.get("stack", 100.0),
                bet_sizes=config.get("bet_sizes", [0.5, 1.0]),
                max_raises=config.get("max_raises", 2),
                max_runouts=config.get("max_runouts", 3),
            )

            # Create C++ solver in executor
            cpp_solver = await asyncio.wait_for(
                loop.run_in_executor(
                    self._executor,
                    lambda: NLHECppSolver(cpp_config)
                ),
                timeout=TREE_BUILD_TIMEOUT
            )

            tree_stats = cpp_solver.tree_stats()
            logger.info("C++ tree built: %d info sets, %d nodes",
                        tree_stats.info_sets, tree_stats.total_nodes())

        except asyncio.TimeoutError:
            error_msg = f"C++ tree building timed out after {TREE_BUILD_TIMEOUT}s"
            logger.error(error_msg)
            await self.db.create_solve(solve_id, "nlhe_subgame", num_iterations, config)
            await self.db.update_solve_status(solve_id, "failed", error=error_msg)
            raise ValueError(error_msg)
        except Exception as e:
            error_msg = f"C++ solver creation failed: {str(e)}"
            logger.exception(error_msg)
            await self.db.create_solve(solve_id, "nlhe_subgame", num_iterations, config)
            await self.db.update_solve_status(solve_id, "failed", error=error_msg)
            raise ValueError(error_msg)

        state = SolverState(
            solve_id=solve_id,
            variant=GameVariant.NLHE_SUBGAME,
            root=None,
            info_store=None,
            solver=None,
            locker=None,
            target_iterations=num_iterations,
            cpp_solver=cpp_solver,
            cpp_config=cpp_config,
        )

        async with self._lock:
            self._solvers[solve_id] = state

        # Persist
        await self.db.create_solve(solve_id, "nlhe_subgame", num_iterations, config)

        # Run solve
        if os.environ.get("VERCEL"):
            await self._run_cpp_solve(state)
        else:
            state.task = asyncio.create_task(
                self._run_cpp_solve(state)
            )

        return solve_id

    async def _run_solve(self, state: SolverState) -> None:
        """Run CFR solve in thread pool with timeout protection."""
        state.status = SolveStatus.RUNNING
        await self.db.update_solve_status(state.solve_id, "running")

        loop = asyncio.get_event_loop()

        try:
            # Run CFR with timeout
            logger.info(
                "Starting CFR solve %s: %d iterations",
                state.solve_id, state.target_iterations
            )

            ev = await asyncio.wait_for(
                loop.run_in_executor(
                    self._executor,
                    state.solver.solve,
                    state.target_iterations,
                ),
                timeout=SOLVE_TIMEOUT
            )

            state.status = SolveStatus.COMPLETED
            state.completed_iterations = state.solver.iteration

            # Compute exploitability with timeout
            try:
                exploitability = await asyncio.wait_for(
                    loop.run_in_executor(
                        self._executor,
                        state.solver.get_exploitability,
                    ),
                    timeout=EXPLOITABILITY_TIMEOUT
                )
            except asyncio.TimeoutError:
                logger.warning(
                    "Exploitability computation timed out for %s",
                    state.solve_id
                )
                exploitability = None

            # Save results to DB
            await self.db.update_solve_status(
                state.solve_id, "completed",
                ev_p0=ev,
                exploitability=exploitability,
                num_info_sets=len(state.info_store),
                completed_iterations=state.solver.iteration,
            )

            # Save strategies
            await self._save_strategies(state)

            logger.info(
                "Solve %s completed: EV=%.4f, exploit=%s, %d info sets",
                state.solve_id, ev,
                f"{exploitability:.4f}" if exploitability else "N/A",
                len(state.info_store)
            )

        except asyncio.TimeoutError:
            state.status = SolveStatus.FAILED
            state.error_message = f"Solve timed out after {SOLVE_TIMEOUT}s"
            logger.error("Solve %s timed out", state.solve_id)
            await self.db.update_solve_status(
                state.solve_id, "failed",
                error=state.error_message,
                completed_iterations=state.solver.iteration,
            )

        except asyncio.CancelledError:
            state.status = SolveStatus.CANCELLED
            logger.info("Solve %s cancelled", state.solve_id)
            await self.db.update_solve_status(state.solve_id, "cancelled")

        except Exception as e:
            state.status = SolveStatus.FAILED
            state.error_message = str(e)
            logger.exception("Solve %s failed", state.solve_id)
            await self.db.update_solve_status(
                state.solve_id, "failed", error=str(e)
            )

    async def _run_cpp_solve(self, state: SolverState) -> None:
        """Run C++ CFR solve with progress callbacks."""
        state.status = SolveStatus.RUNNING
        await self.db.update_solve_status(state.solve_id, "running")

        loop = asyncio.get_event_loop()

        # Progress tracking
        progress_data = {"iteration": 0, "ev": 0.0}

        def progress_callback(iter_num: int, completed: int, total: int, ev: float) -> bool:
            """Called from C++ solver during iteration."""
            progress_data["iteration"] = completed
            progress_data["ev"] = ev
            state.completed_iterations = completed
            # Return True to continue, False to cancel
            return True

        try:
            logger.info(
                "Starting C++ CFR solve %s: %d iterations",
                state.solve_id, state.target_iterations
            )

            # Run C++ solver in thread pool
            # Note: The C++ solver releases GIL during computation
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    self._executor,
                    lambda: state.cpp_solver.solve(
                        state.target_iterations,
                        progress_callback,
                        100  # callback every 100 iterations
                    )
                ),
                timeout=SOLVE_TIMEOUT
            )

            if result.error:
                raise RuntimeError(result.error)

            if result.cancelled:
                state.status = SolveStatus.CANCELLED
                logger.info("C++ solve %s cancelled", state.solve_id)
                await self.db.update_solve_status(state.solve_id, "cancelled")
                return

            state.status = SolveStatus.COMPLETED
            state.completed_iterations = result.completed_iterations
            state.ev_p0 = result.ev_p0
            state.exploitability = result.exploitability

            # Save results to DB
            await self.db.update_solve_status(
                state.solve_id, "completed",
                ev_p0=result.ev_p0,
                exploitability=result.exploitability,
                num_info_sets=result.total_info_sets,
                completed_iterations=result.completed_iterations,
            )

            # Save strategies
            await self._save_cpp_strategies(state)

            logger.info(
                "C++ solve %s completed: EV=%.4f, exploit=%.4f, %d info sets",
                state.solve_id, result.ev_p0, result.exploitability,
                result.total_info_sets
            )

        except asyncio.TimeoutError:
            state.status = SolveStatus.FAILED
            state.error_message = f"C++ solve timed out after {SOLVE_TIMEOUT}s"
            logger.error("C++ solve %s timed out", state.solve_id)
            await self.db.update_solve_status(
                state.solve_id, "failed",
                error=state.error_message,
                completed_iterations=state.completed_iterations,
            )

        except asyncio.CancelledError:
            state.status = SolveStatus.CANCELLED
            logger.info("C++ solve %s cancelled", state.solve_id)
            await self.db.update_solve_status(state.solve_id, "cancelled")

        except Exception as e:
            state.status = SolveStatus.FAILED
            state.error_message = str(e)
            logger.exception("C++ solve %s failed", state.solve_id)
            await self.db.update_solve_status(
                state.solve_id, "failed", error=str(e)
            )

    async def _save_cpp_strategies(self, state: SolverState) -> None:
        """Save C++ solver strategies to the database."""
        cpp_strategies = state.cpp_solver.get_strategies()
        strategies = {}
        for key, (actions, probs, locked) in cpp_strategies.items():
            strategies[key] = {
                "actions": actions,
                "probs": list(probs),
                "locked": locked,
            }
        await self.db.save_strategies(state.solve_id, strategies)

    async def _save_strategies(self, state: SolverState) -> None:
        """Save all strategies to the database."""
        strategies = {}
        for key, data in state.info_store.items():
            actions = state.action_labels.get(key, [])
            probs = data.get_average_strategy().tolist()
            strategies[key] = {
                "actions": actions,
                "probs": probs,
                "locked": data.locked,
            }
        await self.db.save_strategies(state.solve_id, strategies)

    async def get_solve_status(self, solve_id: str) -> dict | None:
        """Get current solve status."""
        # Check in-memory first
        state = self._solvers.get(solve_id)
        if state:
            # Handle C++ solver state
            if state.cpp_solver is not None:
                progress = (state.completed_iterations / state.target_iterations
                            if state.target_iterations > 0 else 0)
                result = {
                    "solve_id": solve_id,
                    "status": state.status.value,
                    "variant": state.variant.value,
                    "num_iterations": state.target_iterations,
                    "progress": min(1.0, progress),
                    "ev_p0": state.ev_p0 if state.status == SolveStatus.COMPLETED else None,
                    "exploitability": state.exploitability,
                    "num_info_sets": state.cpp_solver.num_info_sets(),
                    "cpp_solver": True,
                }
            else:
                # Python solver state
                result = {
                    "solve_id": solve_id,
                    "status": state.status.value,
                    "variant": state.variant.value,
                    "num_iterations": state.target_iterations,
                    "progress": min(1.0, state.solver.iteration / state.target_iterations) if state.target_iterations > 0 else 0,
                    "ev_p0": state.solver.get_average_ev() if state.status == SolveStatus.COMPLETED else None,
                    "exploitability": None,
                    "num_info_sets": len(state.info_store),
                    "cpp_solver": False,
                }
            if state.error_message:
                result["error"] = state.error_message
            return result
        # Fall back to DB
        return await self.db.get_solve(solve_id)

    async def get_strategies(self, solve_id: str,
                             keys: list[str] | None = None,
                             prefix: str | None = None) -> list[dict]:
        """Get strategies for a solve."""
        return await self.db.get_strategies(solve_id, keys=keys, prefix=prefix)

    async def get_info_set_keys(self, solve_id: str) -> list[str]:
        return await self.db.get_info_set_keys(solve_id)

    async def apply_node_locks(self, solve_id: str,
                               locks: dict[str, list[float]],
                               resolve_iterations: int = 1000) -> dict[str, bool]:
        """Apply node locks and re-solve for exploitative strategy."""
        state = self._solvers.get(solve_id)
        if state is None:
            raise ValueError(f"Solve {solve_id} not in memory (must be a recent solve)")
        if state.status != SolveStatus.COMPLETED:
            raise ValueError(f"Solve {solve_id} is not completed (status: {state.status})")

        # Handle C++ solver
        if state.cpp_solver is not None:
            results = state.cpp_solver.apply_locks(locks)

            # Save locks to DB
            for key, strategy in locks.items():
                if results.get(key):
                    await self.db.save_node_lock(solve_id, key, list(strategy))

            # Prepare for re-solve
            state.cpp_solver.prepare_for_resolve()
            state.status = SolveStatus.RUNNING
            state.target_iterations += resolve_iterations
            await self.db.update_solve_status(solve_id, "running")

            if os.environ.get("VERCEL"):
                await self._run_cpp_solve(state)
            else:
                state.task = asyncio.create_task(
                    self._run_cpp_solve(state)
                )

            return results

        # Python solver
        spec = NodeLockSpec(locks=locks)
        results = state.locker.apply_locks(spec)

        # Save locks to DB
        for key, strategy in locks.items():
            if results.get(key):
                await self.db.save_node_lock(solve_id, key, strategy)

        # Re-solve
        state.locker.prepare_for_resolve()
        state.status = SolveStatus.RUNNING
        state.target_iterations += resolve_iterations
        await self.db.update_solve_status(solve_id, "running")

        if os.environ.get("VERCEL"):
            await self._run_solve(state)
        else:
            state.task = asyncio.create_task(
                self._run_solve(state)
            )

        return results

    async def get_ev_comparison(self, solve_id: str) -> dict:
        """Get EV comparison between GTO and best response strategies."""
        state = self._solvers.get(solve_id)
        if state is None:
            raise ValueError(f"Solve {solve_id} not in memory")

        # C++ solver: return cached values (exploitability already computed)
        if state.cpp_solver is not None:
            ev_p0 = state.ev_p0 or 0.0
            exploitability = state.exploitability or 0.0
            return {
                "gto_ev_p0": ev_p0,
                "gto_ev_p1": -ev_p0,  # Zero-sum game
                "br_ev_p0": ev_p0 + exploitability / 2,
                "br_ev_p1": -ev_p0 + exploitability / 2,
                "exploitability": exploitability,
            }

        loop = asyncio.get_event_loop()

        try:
            comparison = await asyncio.wait_for(
                loop.run_in_executor(
                    self._executor,
                    compute_ev_comparison,
                    state.root,
                    state.info_store,
                ),
                timeout=EXPLOITABILITY_TIMEOUT
            )
            return comparison
        except asyncio.TimeoutError:
            raise ValueError(f"EV comparison timed out after {EXPLOITABILITY_TIMEOUT}s")

    async def cancel_solve(self, solve_id: str) -> bool:
        """Cancel a running solve."""
        state = self._solvers.get(solve_id)
        if state and state.task and not state.task.done():
            state.task.cancel()
            state.status = SolveStatus.CANCELLED
            await self.db.update_solve_status(solve_id, "cancelled")
            return True

        # Try deleting from DB
        return await self.db.delete_solve(solve_id)


def _collect_action_labels(root: GameNode) -> dict[str, list[str]]:
    """Walk the tree and collect action labels per info set key."""
    from .game_tree import ActionNode, ChanceNode

    labels: dict[str, list[str]] = {}
    stack = [root]
    while stack:
        node = stack.pop()
        if isinstance(node, ActionNode):
            if node.info_set_key and node.info_set_key not in labels:
                labels[node.info_set_key] = [a.label for a in node.actions]
            stack.extend(node.children.values())
        elif isinstance(node, ChanceNode):
            stack.extend(child for _, child in node.outcomes.values())
    return labels
