"""Integration tests for the solver API endpoints."""

import asyncio
import pytest
from fastapi.testclient import TestClient

from pulse.api.server import create_app


@pytest.fixture
def client():
    """Create a test client with solver manager initialized."""
    app = create_app()
    with TestClient(app) as c:
        yield c


class TestSolverAPI:
    def test_start_kuhn_solve(self, client):
        """POST /api/v1/solver/solve starts a Kuhn solve."""
        resp = client.post("/api/v1/solver/solve", json={
            "variant": "kuhn",
            "num_iterations": 500,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "running"
        assert data["variant"] == "kuhn"
        assert data["num_iterations"] == 500
        assert "solve_id" in data

    def test_full_workflow(self, client):
        """Full solve → poll → strategy → nodelock → compare workflow."""
        # 1. Start solve
        resp = client.post("/api/v1/solver/solve", json={
            "variant": "kuhn",
            "num_iterations": 500,
        })
        assert resp.status_code == 200
        solve_id = resp.json()["solve_id"]

        # 2. Poll until completed (with timeout)
        import time
        for _ in range(20):
            resp = client.get(f"/api/v1/solver/solve/{solve_id}")
            assert resp.status_code == 200
            status = resp.json()["status"]
            if status == "completed":
                break
            time.sleep(0.3)
        else:
            pytest.fail(f"Solve did not complete, status: {status}")

        data = resp.json()
        assert data["ev_p0"] is not None
        assert data["num_info_sets"] > 0

        # 3. Get info set keys
        resp = client.get(f"/api/v1/solver/info-sets/{solve_id}")
        assert resp.status_code == 200
        keys_data = resp.json()
        assert keys_data["total"] == 12  # Kuhn has 12 info sets

        # 4. Get strategy
        resp = client.get(f"/api/v1/solver/strategy/{solve_id}")
        assert resp.status_code == 200
        strat_data = resp.json()
        assert strat_data["total_info_sets"] == 12
        assert len(strat_data["strategies"]) == 12

        # Verify strategy entries have correct shape
        for entry in strat_data["strategies"]:
            assert len(entry["actions"]) == len(entry["probabilities"])
            assert abs(sum(entry["probabilities"]) - 1.0) < 0.01

        # 5. Get strategy filtered by prefix
        resp = client.get(f"/api/v1/solver/strategy/{solve_id}?prefix=K:")
        assert resp.status_code == 200
        k_strats = resp.json()
        assert k_strats["total_info_sets"] > 0
        for entry in k_strats["strategies"]:
            assert entry["info_set_key"].startswith("K:")

        # 6. EV comparison
        resp = client.get(f"/api/v1/solver/compare/{solve_id}")
        assert resp.status_code == 200
        comp = resp.json()
        assert abs(comp["gto_ev_p0"] - (-1.0 / 18)) < 0.05
        assert comp["exploitability"] < 0.05

        # 7. Apply node lock (P2 always calls)
        resp = client.post("/api/v1/solver/nodelock", json={
            "solve_id": solve_id,
            "locks": {
                "J:b": [0.0, 1.0],  # always call with J
                "Q:b": [0.0, 1.0],
                "K:b": [0.0, 1.0],
            },
            "resolve_iterations": 500,
        })
        assert resp.status_code == 200
        lock_data = resp.json()
        assert lock_data["locks_applied"]["J:b"] is True
        assert lock_data["status"] == "running"

        # 8. Wait for re-solve
        for _ in range(20):
            resp = client.get(f"/api/v1/solver/solve/{solve_id}")
            if resp.json()["status"] == "completed":
                break
            time.sleep(0.3)

    def test_solve_not_found(self, client):
        """GET nonexistent solve returns 404."""
        resp = client.get("/api/v1/solver/solve/nonexistent")
        assert resp.status_code == 404

    def test_delete_solve(self, client):
        """DELETE cancels and removes a solve."""
        resp = client.post("/api/v1/solver/solve", json={
            "variant": "kuhn",
            "num_iterations": 100,
        })
        solve_id = resp.json()["solve_id"]

        resp = client.delete(f"/api/v1/solver/solve/{solve_id}")
        assert resp.status_code == 200
        assert resp.json()["status"] == "deleted"
