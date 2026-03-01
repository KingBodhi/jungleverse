"""Standalone FastAPI server for the poker CFR solver."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pulse.solver.manager import SolverManager
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
    mgr = SolverManager()
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


def _mgr(request):
    from fastapi import HTTPException, Request
    mgr = getattr(request.app.state, "solver_manager", None)
    if not mgr:
        raise HTTPException(503, "Solver not ready")
    return mgr


@app.post("/api/v1/solver/solve", response_model=SolveResponse)
async def start_solve(request, body: SolveRequest):
    from fastapi import HTTPException
    mgr = _mgr(request)
    config = None
    if body.variant == GameVariant.NLHE_SUBGAME:
        config = {k: v for k, v in {
            "board": body.board, "range_p0": body.range_p0,
            "range_p1": body.range_p1, "pot": body.pot,
            "stack": body.stack, "bet_sizes": body.bet_sizes,
        }.items() if v is not None}
    try:
        solve_id = await mgr.create_solve(body.variant, body.num_iterations, config)
    except Exception as e:
        raise HTTPException(400, str(e))
    return SolveResponse(solve_id=solve_id, status=SolveStatus.RUNNING,
                         variant=body.variant, num_iterations=body.num_iterations)


@app.get("/api/v1/solver/solve/{solve_id}", response_model=SolveResponse)
async def get_solve(request, solve_id: str):
    from fastapi import HTTPException
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
async def get_strategy(request, solve_id: str, keys: str = None, prefix: str = None):
    mgr = _mgr(request)
    key_list = keys.split(",") if keys else None
    rows = await mgr.get_strategies(solve_id, keys=key_list, prefix=prefix)
    strategies = [StrategyEntry(info_set_key=r["info_set_key"], actions=r["actions"],
                                probabilities=r["probabilities"], is_locked=r["is_locked"])
                  for r in rows]
    return StrategyResponse(solve_id=solve_id, strategies=strategies,
                            total_info_sets=len(strategies))


@app.get("/api/v1/solver/info-sets/{solve_id}", response_model=InfoSetsResponse)
async def get_info_sets(request, solve_id: str):
    mgr = _mgr(request)
    keys = await mgr.get_info_set_keys(solve_id)
    return InfoSetsResponse(solve_id=solve_id, info_set_keys=keys, total=len(keys))


@app.post("/api/v1/solver/nodelock", response_model=NodeLockResponse)
async def nodelock(request, body: NodeLockRequest):
    from fastapi import HTTPException
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
async def compare(request, solve_id: str):
    from fastapi import HTTPException
    mgr = _mgr(request)
    try:
        c = await mgr.get_ev_comparison(solve_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return EVComparisonResponse(solve_id=solve_id, **c)


@app.delete("/api/v1/solver/solve/{solve_id}")
async def delete_solve(request, solve_id: str):
    from fastapi import HTTPException
    mgr = _mgr(request)
    if not await mgr.cancel_solve(solve_id):
        raise HTTPException(404, f"Solve {solve_id} not found")
    return {"status": "deleted", "solve_id": solve_id}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "poker-cfr-solver"}
