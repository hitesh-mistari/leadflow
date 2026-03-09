# LeadFlow CRM

A full-stack CRM application with **separated frontend and backend**.

## Project Structure

```
leadflow/
├── backend/          ← Express API + PostgreSQL
│   ├── server.ts     ← Main API server
│   ├── .env          ← DB connection string & secrets
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/         ← React + Vite SPA
    ├── src/          ← React components, pages, context
    ├── index.html
    ├── .env          ← VITE_API_URL (for production)
    ├── vite.config.ts ← Dev proxy: /api → localhost:3001
    └── package.json
```

## Getting Started

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
# → Runs on http://localhost:3001
# → Connects to remote PostgreSQL automatically
```

### 2. Start the Frontend (in a new terminal)

```bash
cd frontend
npm install
npm run dev
# → Runs on http://localhost:5173
# → Vite dev proxy sends /api requests to the backend
```

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `PORT` | API server port (default: 3001) |
| `FRONTEND_URL` | Allowed CORS origin |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL for **production** builds only |

> In **development**, Vite proxies `/api` calls to `http://localhost:3001` automatically — no CORS issues.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/leads` | List leads (paginated, filterable) |
| POST | `/api/leads/import` | Bulk import leads |
| GET | `/api/leads/:id` | Get single lead |
| PUT | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| GET | `/api/leads/:id/calls` | Get call logs for lead |
| POST | `/api/calls` | Log a new call |
| GET | `/api/dashboard/stats` | Dashboard statistics |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
