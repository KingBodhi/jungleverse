"""Standalone FastAPI server for the poker CFR solver."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from pulse.solver.manager import SolverManager, CPP_SOLVER_AVAILABLE
from pulse.solver.models import (
    EVComparisonResponse,
    GameVariant,
    InfoSetsResponse,
    NodeLockRequest,
    NodeLockResponse,
    SolveRequest,
    SolveResponse,
    SolveStatus,
    StrategyEntry,
    StrategyResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Use /tmp on Vercel (only writable directory in serverless)
    db_path = "/tmp/solver.db" if os.environ.get("VERCEL") else "data/solver.db"
    mgr = SolverManager(db_path=db_path)
    await mgr.start()
    app.state.solver_manager = mgr
    logger.info("Solver manager started")
    yield
    await mgr.stop()
    logger.info("Solver manager stopped")


app = FastAPI(
    title="Poker CFR Solver",
    description="Counterfactual Regret Minimization solver with node locking",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _mgr(request: Request) -> SolverManager:
    mgr = getattr(request.app.state, "solver_manager", None)
    if not mgr:
        raise HTTPException(503, "Solver not ready")
    return mgr


@app.post("/api/v1/solver/solve", response_model=SolveResponse)
async def start_solve(request: Request, body: SolveRequest):
    mgr = _mgr(request)

    # Build config for NLHE
    config = None
    if body.variant == GameVariant.NLHE_SUBGAME:
        config = {k: v for k, v in {
            "board": body.board, "range_p0": body.range_p0,
            "range_p1": body.range_p1, "pot": body.pot,
            "stack": body.stack, "bet_sizes": body.bet_sizes,
        }.items() if v is not None}

    try:
        # Manager handles iteration limits and crash protection
        solve_id = await mgr.create_solve(body.variant, body.num_iterations, config)
    except ValueError as e:
        # Tree build timeout or complexity error
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Solve failed: {str(e)}")

    # Check if solve completed synchronously (Vercel) or is running (Docker)
    state = mgr._solvers.get(solve_id)
    if state:
        if state.status == SolveStatus.COMPLETED:
            # Handle C++ solver state
            if state.cpp_solver is not None:
                return SolveResponse(
                    solve_id=solve_id, status=SolveStatus.COMPLETED,
                    variant=body.variant, num_iterations=state.target_iterations,
                    progress=1.0, ev_p0=state.ev_p0,
                    exploitability=state.exploitability,
                    num_info_sets=state.cpp_solver.num_info_sets(),
                )
            else:
                return SolveResponse(
                    solve_id=solve_id, status=SolveStatus.COMPLETED,
                    variant=body.variant, num_iterations=state.target_iterations,
                    progress=1.0, ev_p0=state.solver.get_average_ev(),
                    exploitability=state.solver.get_exploitability(),
                    num_info_sets=len(state.info_store),
                )
        elif state.status == SolveStatus.FAILED:
            return SolveResponse(
                solve_id=solve_id, status=SolveStatus.FAILED,
                variant=body.variant, num_iterations=state.target_iterations,
                progress=0.0, error=state.error_message,
            )

    return SolveResponse(
        solve_id=solve_id, status=SolveStatus.RUNNING,
        variant=body.variant, num_iterations=body.num_iterations
    )


@app.get("/api/v1/solver/solve/{solve_id}", response_model=SolveResponse)
async def get_solve(request: Request, solve_id: str):
    mgr = _mgr(request)
    data = await mgr.get_solve_status(solve_id)
    if not data:
        raise HTTPException(404, f"Solve {solve_id} not found")
    return SolveResponse(
        solve_id=data.get("solve_id", solve_id),
        status=SolveStatus(data["status"]),
        variant=GameVariant(data["variant"]),
        num_iterations=data["num_iterations"],
        progress=data.get("progress", 0.0),
        ev_p0=data.get("ev_p0"),
        exploitability=data.get("exploitability"),
        num_info_sets=data.get("num_info_sets", 0),
        error=data.get("error"),
    )


@app.get("/api/v1/solver/strategy/{solve_id}", response_model=StrategyResponse)
async def get_strategy(request: Request, solve_id: str, keys: str = None, prefix: str = None):
    mgr = _mgr(request)
    key_list = keys.split(",") if keys else None
    rows = await mgr.get_strategies(solve_id, keys=key_list, prefix=prefix)
    strategies = [StrategyEntry(info_set_key=r["info_set_key"], actions=r["actions"],
                                probabilities=r["probabilities"], is_locked=r["is_locked"])
                  for r in rows]
    return StrategyResponse(solve_id=solve_id, strategies=strategies,
                            total_info_sets=len(strategies))


@app.get("/api/v1/solver/info-sets/{solve_id}", response_model=InfoSetsResponse)
async def get_info_sets(request: Request, solve_id: str):
    mgr = _mgr(request)
    keys = await mgr.get_info_set_keys(solve_id)
    return InfoSetsResponse(solve_id=solve_id, info_set_keys=keys, total=len(keys))


@app.post("/api/v1/solver/nodelock", response_model=NodeLockResponse)
async def nodelock(request: Request, body: NodeLockRequest):
    mgr = _mgr(request)
    try:
        results = await mgr.apply_node_locks(body.solve_id, body.locks,
                                             body.resolve_iterations)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return NodeLockResponse(solve_id=body.solve_id, locks_applied=results,
                            status=SolveStatus.RUNNING,
                            resolve_iterations=body.resolve_iterations)


@app.get("/api/v1/solver/compare/{solve_id}", response_model=EVComparisonResponse)
async def compare(request: Request, solve_id: str):
    mgr = _mgr(request)
    try:
        c = await mgr.get_ev_comparison(solve_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return EVComparisonResponse(solve_id=solve_id, **c)


@app.delete("/api/v1/solver/solve/{solve_id}")
async def delete_solve(request: Request, solve_id: str):
    mgr = _mgr(request)
    if not await mgr.cancel_solve(solve_id):
        raise HTTPException(404, f"Solve {solve_id} not found")
    return {"status": "deleted", "solve_id": solve_id}


@app.get("/health")
async def health():
    is_vercel = bool(os.environ.get("VERCEL"))

    # Get OpenMP status from C++ module
    openmp_info = {"enabled": False, "threads": 1}
    if CPP_SOLVER_AVAILABLE:
        try:
            import nlhe_solver_cpp
            openmp_info = {
                "enabled": nlhe_solver_cpp.is_openmp_enabled(),
                "threads": nlhe_solver_cpp.get_num_threads(),
            }
        except Exception:
            pass

    return {
        "status": "ok",
        "service": "poker-cfr-solver",
        "serverless": is_vercel,
        "cpp_solver_available": CPP_SOLVER_AVAILABLE,
        "openmp": openmp_info,
        "crash_protection": "timeout-based",
        "timeouts_seconds": {
            "tree_build": 120,
            "solve": 120,
            "exploitability": 120,
        },
    }
