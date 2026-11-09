# Deployment and local setup

These instructions describe the existing Docker Compose setup. It is intended for local development and requires additional security and storage work before production.

## Prerequisites

- Docker Desktop with Compose v2, running and able to pull images.
- Ports 3000, 8000 and 5432 available, or change the port variables in `.env`.
- PowerShell for the commands below; equivalent shell commands work on other systems.

## Environment configuration

From the project root, create `.env` if it does not already exist:

```powershell
Copy-Item .env.example .env
```

Keep `.env` private. Set matching database credentials in both `POSTGRES_*` and `DATABASE_URL`. The Compose database hostname inside the network is `db`.

| Variable | Purpose / local default |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | PostgreSQL database and credentials. Change the example password outside local development. |
| `POSTGRES_PORT`, `BACKEND_PORT`, `FRONTEND_PORT` | Host ports; defaults 5432, 8000, 3000. |
| `DATABASE_URL` | SQLAlchemy PostgreSQL connection; use `db:5432` inside Compose. |
| `ENVIRONMENT` | Environment label, normally `development` locally. |
| `CORS_ORIGINS` | Comma-separated browser origins, e.g. `http://localhost:3000`. |
| `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | Token signing secret, algorithm and lifetime. Replace the example secret. |
| `NEXT_PUBLIC_API_URL` | API URL reachable by the user's browser, normally `http://localhost:8000`. It is embedded at frontend build time; rebuild after changing it. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional Gemini provider settings. |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | Optional OpenAI-compatible provider settings. Verify endpoint/model compatibility. |

Compose supplies `API_URL=http://backend:8000` to the frontend for server-side calls. A browser on another device cannot use the server's `localhost`; configure a reachable API hostname and matching CORS origin for that deployment.

## Build and start

```powershell
docker compose up -d --build
docker compose ps
docker compose exec backend alembic upgrade head
```

Migrations are a separate step; container startup does not apply them automatically. For subsequent schema changes repeat the migration command after deploying the compatible backend image. Check the revision with:

```powershell
docker compose exec backend alembic current
```

## Seed local demonstration data

Only in a development environment, after migrations:

```powershell
docker compose exec backend python -m app.scripts.seed_demo
```

This script creates demo staff accounts and sample published packages when missing. Demo accounts and their known password are documented in `README.md`; do not seed them in production.

## Verify and operate

Open `http://localhost:3000`, `http://localhost:8000/health`, and `http://localhost:8000/docs`. Sign in to the appropriate staff dashboard and check package and enquiry access. A healthy container does not prove the schema is current, so check Alembic separately.

```powershell
docker compose logs --tail=100 backend frontend
docker compose down
```

`down` stops and removes containers; the named PostgreSQL volume remains unless explicitly removed. Back up and test restoration of that volume before production changes. Quote PDFs are stored in the backend container and can be lost when it is recreated; configure persistent storage before relying on quote links.

## Before production

Use HTTPS and real hostnames, restrict exposed ports, replace demo secrets, disable or restrict public staff registration, configure durable PDF storage and database backups, and review tokenized quote access. Set up messaging separately if acknowledgements must be delivered. Scheduled publication currently occurs on catalogue reads, not at an exact background-triggered time. Review schema constraints and migration rollback behavior before production rollout.
