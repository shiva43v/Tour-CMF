# Tour CMF

Tour CMF is a full-stack travel-operator platform for publishing South India journeys, handling traveller enquiries, managing editorial content, and preparing consultant quotes.

## What is included

- Public journey catalogue with search, package detail pages, day-by-day itineraries, stays, inclusions, seasonal pricing, image galleries, optional maps, and enquiry forms.
- Package CMS with draft revisions, duplicate journeys, seasonal prices, preview links, scheduled publishing, activity records, and publishing controls.
- Blog CMS for Admin and Editor users, including article content, cover images, categories, SEO fields, and related journeys.
- Enquiry CRM with assignment, workflow statuses, notes, replies, fixed acknowledgement recording, AI extraction, recommendations, and reply drafts.
- Consultant quote builder with a branded PDF and tokenized public quote URL.
- Separate Admin, Editor, and Consultant dashboards with backend role checks.

## Stack

- Next.js 15 + TypeScript (`frontend`)
- FastAPI + SQLAlchemy + Alembic (`backend`)
- PostgreSQL 16
- Docker Compose

## Run locally

1. Create a local environment file.

   ```powershell
   Copy-Item .env.example .env
   ```

2. Start the services.

   ```powershell
   docker compose up --build -d
   ```

3. Apply migrations and seed local demonstration accounts.

   ```powershell
   docker compose exec backend alembic upgrade head
   docker compose exec backend python -m app.scripts.seed_demo
   ```

4. Open the services.

   - Public site: `http://localhost:3000`
   - API documentation: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/health`

To stop services:

```powershell
docker compose down
```

## Demo accounts

Use these accounts only for local development. All use password `DemoPass!2026`.

| Role | Email | Landing route |
|---|---|---|
| Admin | `admin@company-a.demo` | `/admin` |
| Editor | `editor@company-a.demo` | `/editor` |
| Consultant | `consultant@company-a.demo` | `/consultant` |

## Dashboards and permissions

| Role | Modules |
|---|---|
| Admin | Journey CMS, Enquiries & AI CRM, Activity Log, Blog CMS, Quote Builder |
| Editor | Journey CMS drafts/revisions, Blog CMS, Activity Log. Editors cannot publish or delete journeys. |
| Consultant | Read-only live journey catalogue, Enquiries & CRM, Quote Builder, Activity Log. Consultants cannot create, edit, publish, schedule, or delete journeys. |

Route guards redirect a signed-in user to their own workspace if they directly open another role's dashboard. Backend API role checks remain the source of authorization.

## Key routes

### Public

- `/packages` - searchable journey catalogue
- `/packages/[slug]` - journey detail and enquiry form
- `/blogs` - published blog posts
- `/blogs/[slug]` - public blog post
- `/quote/[token]` - public quote and PDF download

### Staff

- `/admin`, `/editor` - Journey CMS for their permitted role
- `/admin/blog`, `/editor/blog` - Blog CMS
- `/admin/enquiries`, `/consultant/enquiries` - Enquiry CRM
- `/admin/quotes`, `/consultant/quotes` - Quote Builder
- `/admin/activity`, `/editor/activity`, `/consultant/activity` - Activity Log

## Environment variables

Start from `.env.example`.

| Variable | Purpose |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | PostgreSQL credentials |
| `DATABASE_URL` | Backend database connection string |
| `NEXT_PUBLIC_API_URL` | Browser-visible API address, normally `http://localhost:8000` locally |
| `CORS_ORIGINS` | Comma-separated frontend origins permitted to call the API |
| `JWT_SECRET_KEY` | Secret used to sign session tokens; replace for any non-local environment |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional Gemini configuration |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | Optional OpenAI-compatible AI configuration |

If no AI key is configured, the application uses its development fallback logic for requirement extraction and draft generation.


