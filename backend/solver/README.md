# Poker CFR Solver

Counterfactual Regret Minimization solver for poker with crash protection.

## Features

- **Variants**: Kuhn, Leduc, NLHE Subgame
- **Node Locking**: Lock strategies for exploitative analysis
- **Crash Protection**: Timeouts, complexity limits, auto-restart
- **Cloudflare Tunnel**: Secure exposure via `jungleverse-solver.powerclubglobal.com`

## Deployment with Docker

### 1. Copy to server

```bash
scp -r backend/solver user@your-server:~/jungleverse-solver
```

### 2. Deploy

```bash
cd ~/jungleverse-solver

# Build and start (credentials already configured)
docker compose up -d --build

# Check logs
docker compose logs -f

# Check health
curl http://localhost:8001/health
```

### 3. Verify tunnel

Your solver should be accessible at:
```
https://jungleverse-solver.powerclubglobal.com/health
```

## Configuration

### Timeout-Based Crash Protection

| Operation | Timeout |
|-----------|---------|
| Tree build | 30s |
| CFR solve | 30s |
| Exploitability | 30s |

No artificial limits on iterations, range combos, or bet sizes - only timeouts.

### Persistence

SQLite database is persisted in a Docker volume (`jungleverse-solver-data`).
Solves survive container restarts.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/solver/solve` | Start a new solve |
| GET | `/api/v1/solver/solve/{id}` | Get solve status |
| GET | `/api/v1/solver/strategy/{id}` | Get strategies |
| GET | `/api/v1/solver/info-sets/{id}` | List info sets |
| GET | `/api/v1/solver/compare/{id}` | EV comparison |
| POST | `/api/v1/solver/nodelock` | Apply node locks |
| DELETE | `/api/v1/solver/solve/{id}` | Delete solve |
| GET | `/health` | Health check |

## Management Commands

```bash
# View logs
docker compose logs -f solver
docker compose logs -f cloudflared

# Restart solver (tunnel auto-reconnects)
docker compose restart solver

# Stop everything
docker compose down

# Update and redeploy
git pull
docker compose up -d --build
```

## Local Development

```bash
cd backend/solver
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

## Cloudflare Tunnel

The tunnel config is in `cloudflared/`:
- `config.yml` - Ingress rules (hostname → service)
- `credentials.json` - Tunnel authentication (gitignored)

Tunnel ID: `a490a5cf-e098-475a-a3f1-6f8f26c1907e`
