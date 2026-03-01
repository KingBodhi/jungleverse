import { NextRequest, NextResponse } from "next/server";
import { SolverManager } from "@/lib/solver/solver-manager";

/**
 * Solver API — integrated TypeScript CFR solver (no external backend).
 *
 * GET  /api/solver?action=health              → health check
 * GET  /api/solver?action=status&id=xxx       → solver status
 * GET  /api/solver?action=strategy&id=xxx     → strategy data
 * GET  /api/solver?action=info-sets&id=xxx    → info set keys
 * GET  /api/solver?action=compare&id=xxx      → EV comparison
 * POST /api/solver?action=solve               → start solve (synchronous)
 * POST /api/solver?action=nodelock            → apply node lock + re-solve
 * DELETE /api/solver?id=xxx                   → delete solve
 */

export const maxDuration = 60;

const manager = new SolverManager();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");
  const id = searchParams.get("id");

  if (!action) {
    return NextResponse.json(
      { error: "action parameter required (health, status, strategy, info-sets, compare)" },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      case "health": {
        return NextResponse.json({
          status: "ok",
          service: "poker-cfr-solver",
          integrated: true,
          max_iterations: {
            kuhn: 50_000,
            leduc: 1_000,
            nlhe_subgame: 100,
          },
        });
      }

      case "status": {
        if (!id)
          return NextResponse.json({ error: "id required" }, { status: 400 });
        const data = await manager.getSolveStatus(id);
        if (!data)
          return NextResponse.json(
            { error: `Solve ${id} not found` },
            { status: 404 },
          );
        return NextResponse.json(data);
      }

      case "strategy": {
        if (!id)
          return NextResponse.json({ error: "id required" }, { status: 400 });
        const keys = searchParams.get("keys");
        const prefix = searchParams.get("prefix");
        const keyList = keys ? keys.split(",").filter(Boolean) : undefined;
        const result = await manager.getStrategies(
          id,
          keyList,
          prefix || undefined,
        );
        return NextResponse.json(result);
      }

      case "info-sets": {
        if (!id)
          return NextResponse.json({ error: "id required" }, { status: 400 });
        const result = await manager.getInfoSetKeys(id);
        return NextResponse.json(result);
      }

      case "compare": {
        if (!id)
          return NextResponse.json({ error: "id required" }, { status: 400 });
        const result = await manager.getEVComparison(id);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("Solver API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") || "solve";

  try {
    const body = await request.json();

    switch (action) {
      case "solve": {
        const result = await manager.createAndSolve(body);
        return NextResponse.json(result);
      }

      case "nodelock": {
        const result = await manager.applyNodeLock(body);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("Solver API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const deleted = await manager.deleteSolve(id);
    if (!deleted)
      return NextResponse.json(
        { error: `Solve ${id} not found` },
        { status: 404 },
      );
    return NextResponse.json({ status: "deleted", solve_id: id });
  } catch (err) {
    console.error("Solver API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
