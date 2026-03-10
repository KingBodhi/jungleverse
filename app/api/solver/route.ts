import { NextRequest, NextResponse } from "next/server";
import { SolverManager } from "@/lib/solver/solver-manager";

/**
 * Solver API — routes compute to APN marketplace, reads from local DB.
 *
 * Compute-heavy operations (solve, nodelock) are proxied through the APN
 * marketplace gateway, which routes to the best available provider node,
 * charges VIBE to Jungleverse's subscription, and rewards the servicing device.
 *
 * Lightweight reads (status, strategy, info-sets, compare, health) still run
 * locally against the Prisma DB — no compute cost, no VIBE charge.
 *
 * GET  /api/solver?action=health              → local health check
 * GET  /api/solver?action=status&id=xxx       → local DB read
 * GET  /api/solver?action=strategy&id=xxx     → local DB read
 * GET  /api/solver?action=info-sets&id=xxx    → local DB read
 * GET  /api/solver?action=compare&id=xxx      → local (light compute)
 * POST /api/solver?action=solve               → APN gateway → provider node
 * POST /api/solver?action=nodelock            → APN gateway → provider node
 * DELETE /api/solver?id=xxx                   → local DB delete
 */

export const maxDuration = 60;

const APN_GATEWAY_URL = process.env.APN_GATEWAY_URL;
const APN_API_KEY = process.env.APN_API_KEY;

const manager = new SolverManager();

// ─── APN Gateway proxy ──────────────────────────────────────────────────────

interface GatewayResponse {
  data?: {
    request_id: string;
    provider_node_id: string;
    status: string;
    response: Record<string, unknown>;
    vibe_charged: number;
    response_ms: number;
  };
  error?: string;
}

/**
 * Send a compute request through the APN marketplace gateway.
 * The gateway finds the best provider, routes the request, charges VIBE,
 * and rewards the servicing node.
 */
async function solveViaGateway(
  action: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  if (!APN_GATEWAY_URL || !APN_API_KEY) {
    // Fallback to local solver if gateway not configured
    console.warn("APN gateway not configured, falling back to local solver");
    return solveLocally(action, payload);
  }

  try {
    const res = await fetch(APN_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${APN_API_KEY}`,
      },
      body: JSON.stringify({
        service_type: "compute",
        payload: {
          action,
          ...payload,
        },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      const msg = (error as { error?: string }).error || `Gateway error ${res.status}`;

      // If gateway fails with payment/availability issues, fall back to local
      if (res.status === 402 || res.status === 404 || res.status === 503) {
        console.warn(`APN gateway unavailable (${res.status}: ${msg}), falling back to local solver`);
        return solveLocally(action, payload);
      }

      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const gateway: GatewayResponse = await res.json();

    if (!gateway.data?.response) {
      return NextResponse.json(
        { error: "Empty response from provider" },
        { status: 502 },
      );
    }

    // Return the provider's solver response directly, with APN metadata headers
    const response = NextResponse.json(gateway.data.response);
    response.headers.set("X-APN-Request-Id", gateway.data.request_id);
    response.headers.set("X-APN-Provider", gateway.data.provider_node_id);
    response.headers.set("X-APN-Vibe-Charged", String(gateway.data.vibe_charged));
    response.headers.set("X-APN-Response-Ms", String(gateway.data.response_ms));
    return response;
  } catch (err) {
    console.error("APN gateway error, falling back to local:", err);
    return solveLocally(action, payload);
  }
}

/** Fallback: run the solver locally (original behavior) */
async function solveLocally(
  action: string,
  body: Record<string, unknown>,
): Promise<Response> {
  if (action === "solve") {
    const result = await manager.createAndSolve(body as Parameters<typeof manager.createAndSolve>[0]);
    return NextResponse.json(result);
  } else if (action === "nodelock") {
    const result = await manager.applyNodeLock(body as Parameters<typeof manager.applyNodeLock>[0]);
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ─── GET: lightweight reads (local) ─────────────────────────────────────────

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
          apn_gateway: !!APN_GATEWAY_URL,
          fallback: !APN_GATEWAY_URL ? "local" : "enabled",
          max_iterations: {
            kuhn: 50_000,
            leduc: 1_000,
            nlhe_subgame: APN_GATEWAY_URL ? 100_000 : 10_000,
          },
          nlhe_time_budget_ms: APN_GATEWAY_URL ? null : 45_000,
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

// ─── POST: compute-heavy operations → APN gateway ──────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") || "solve";

  try {
    const body = await request.json();
    return await solveViaGateway(action, body);
  } catch (err) {
    console.error("Solver API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: local DB cleanup ───────────────────────────────────────────────

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
