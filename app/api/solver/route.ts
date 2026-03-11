import { NextRequest, NextResponse } from "next/server";

/**
 * Solver API — routes to external Python solver or falls back to local TS solver.
 *
 * When SOLVER_URL is set, ALL requests are proxied to the external Python solver.
 * The TypeScript solver is completely bypassed.
 *
 * When SOLVER_URL is not set, falls back to local TypeScript solver (with Vercel
 * timeout constraints) or APN gateway if configured.
 *
 * GET  /api/solver?action=health              → health check
 * GET  /api/solver?action=status&id=xxx       → solve status
 * GET  /api/solver?action=strategy&id=xxx     → get strategies
 * GET  /api/solver?action=info-sets&id=xxx    → list info set keys
 * GET  /api/solver?action=compare&id=xxx      → EV comparison
 * POST /api/solver?action=solve               → start solve
 * POST /api/solver?action=nodelock            → apply node locks
 * DELETE /api/solver?id=xxx                   → delete solve
 */

export const maxDuration = 60;

const SOLVER_URL = process.env.SOLVER_URL;
const APN_GATEWAY_URL = process.env.APN_GATEWAY_URL;
const APN_API_KEY = process.env.APN_API_KEY;

// ─── External Python Solver Proxy ────────────────────────────────────────────
// When SOLVER_URL is set, all requests are proxied to the external solver.
// The TypeScript solver is never loaded or executed.

/**
 * Proxy a GET request to the external Python solver.
 * Maps Next.js API format to Python FastAPI format.
 */
async function proxyGet(
  action: string,
  id: string | null,
  searchParams: URLSearchParams,
): Promise<Response> {
  let url: string;

  switch (action) {
    case "health":
      url = `${SOLVER_URL}/health`;
      break;
    case "status":
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      url = `${SOLVER_URL}/api/v1/solver/solve/${id}`;
      break;
    case "strategy": {
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const params = new URLSearchParams();
      const keys = searchParams.get("keys");
      const prefix = searchParams.get("prefix");
      if (keys) params.set("keys", keys);
      if (prefix) params.set("prefix", prefix);
      const qs = params.toString();
      url = `${SOLVER_URL}/api/v1/solver/strategy/${id}${qs ? `?${qs}` : ""}`;
      break;
    }
    case "info-sets":
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      url = `${SOLVER_URL}/api/v1/solver/info-sets/${id}`;
      break;
    case "compare":
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      url = `${SOLVER_URL}/api/v1/solver/compare/${id}`;
      break;
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || `Solver error ${res.status}` },
        { status: res.status },
      );
    }

    const response = NextResponse.json(data);
    response.headers.set("X-Solver-Backend", "external");
    response.headers.set("X-Solver-URL", SOLVER_URL!);
    return response;
  } catch (err) {
    console.error("External solver error:", err);
    return NextResponse.json(
      { error: `Failed to reach solver at ${SOLVER_URL}: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}

/**
 * Proxy a POST request to the external Python solver.
 */
async function proxyPost(
  action: string,
  body: Record<string, unknown>,
): Promise<Response> {
  let url: string;

  if (action === "solve") {
    url = `${SOLVER_URL}/api/v1/solver/solve`;
  } else if (action === "nodelock") {
    url = `${SOLVER_URL}/api/v1/solver/nodelock`;
  } else {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || `Solver error ${res.status}` },
        { status: res.status },
      );
    }

    const response = NextResponse.json(data);
    response.headers.set("X-Solver-Backend", "external");
    response.headers.set("X-Solver-URL", SOLVER_URL!);
    return response;
  } catch (err) {
    console.error("External solver error:", err);
    return NextResponse.json(
      { error: `Failed to reach solver at ${SOLVER_URL}: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}

/**
 * Proxy a DELETE request to the external Python solver.
 */
async function proxyDelete(id: string): Promise<Response> {
  const url = `${SOLVER_URL}/api/v1/solver/solve/${id}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || `Solver error ${res.status}` },
        { status: res.status },
      );
    }

    const response = NextResponse.json(data);
    response.headers.set("X-Solver-Backend", "external");
    return response;
  } catch (err) {
    console.error("External solver error:", err);
    return NextResponse.json(
      { error: `Failed to reach solver at ${SOLVER_URL}: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
}

// ─── Local TypeScript Solver (fallback) ──────────────────────────────────────
// Only loaded when SOLVER_URL is not set.

let manager: import("@/lib/solver/solver-manager").SolverManager | null = null;

async function getLocalManager() {
  if (!manager) {
    const { SolverManager } = await import("@/lib/solver/solver-manager");
    manager = new SolverManager();
  }
  return manager;
}

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

async function solveViaGateway(
  action: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  if (!APN_GATEWAY_URL || !APN_API_KEY) {
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
        payload: { action, ...payload },
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      const msg = (error as { error?: string }).error || `Gateway error ${res.status}`;

      if (res.status === 402 || res.status === 404 || res.status === 503) {
        console.warn(`APN gateway unavailable (${res.status}: ${msg}), falling back to local solver`);
        return solveLocally(action, payload);
      }

      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const gateway: GatewayResponse = await res.json();

    if (!gateway.data?.response) {
      return NextResponse.json({ error: "Empty response from provider" }, { status: 502 });
    }

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

async function solveLocally(
  action: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const mgr = await getLocalManager();

  if (action === "solve") {
    const result = await mgr.createAndSolve(body as Parameters<typeof mgr.createAndSolve>[0]);
    return NextResponse.json(result);
  } else if (action === "nodelock") {
    const result = await mgr.applyNodeLock(body as Parameters<typeof mgr.applyNodeLock>[0]);
    return NextResponse.json(result);
  }
  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

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

  // ─── External solver takes priority ───
  if (SOLVER_URL) {
    return proxyGet(action, id, searchParams);
  }

  // ─── Local TypeScript solver fallback ───
  try {
    const mgr = await getLocalManager();

    switch (action) {
      case "health": {
        return NextResponse.json({
          status: "ok",
          service: "poker-cfr-solver",
          backend: "local-typescript",
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
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const data = await mgr.getSolveStatus(id);
        if (!data) return NextResponse.json({ error: `Solve ${id} not found` }, { status: 404 });
        return NextResponse.json(data);
      }

      case "strategy": {
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const keys = searchParams.get("keys");
        const prefix = searchParams.get("prefix");
        const keyList = keys ? keys.split(",").filter(Boolean) : undefined;
        const result = await mgr.getStrategies(id, keyList, prefix || undefined);
        return NextResponse.json(result);
      }

      case "info-sets": {
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const result = await mgr.getInfoSetKeys(id);
        return NextResponse.json(result);
      }

      case "compare": {
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const result = await mgr.getEVComparison(id);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("Solver API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") || "solve";

  try {
    const body = await request.json();

    // ─── External solver takes priority ───
    if (SOLVER_URL) {
      return proxyPost(action, body);
    }

    // ─── APN gateway or local fallback ───
    return solveViaGateway(action, body);
  } catch (err) {
    console.error("Solver API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE Handler ──────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // ─── External solver takes priority ───
  if (SOLVER_URL) {
    return proxyDelete(id);
  }

  // ─── Local TypeScript solver fallback ───
  try {
    const mgr = await getLocalManager();
    const deleted = await mgr.deleteSolve(id);
    if (!deleted) return NextResponse.json({ error: `Solve ${id} not found` }, { status: 404 });
    return NextResponse.json({ status: "deleted", solve_id: id });
  } catch (err) {
    console.error("Solver API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
