# DocuSaathi — AI Document Companion for India

> **Hackathon MVP** — Transforms complex Indian documents (GST invoices, tax notices, rent agreements, bank letters) into plain-language explanations, risk flags, deadlines, and actionable plans.

---

## Architecture Overview

```
DocuSaathi/
├── frontend/          # React + Vite + Tailwind CSS (TypeScript)
└── backend/           # Node.js + Express REST API
```

### Frontend → Backend communication

```
Browser (React)
    │
    │  /api/* requests
    ▼
Vite Dev Proxy (port 5173)  ──dev only──►  Express API (port 4000)
    │
    │  Production
    ▼
VITE_API_URL env var → Deployed backend URL
```

### Core AI Pipeline (Phase 2+)

```
Document Upload (Supabase Storage)
    │
    ▼
Gemini Multimodal API (backend only — key never reaches browser)
    │
    ├── Document Classification
    ├── Structured Data Extraction
    ├── Validation & Error Detection
    ├── Plain-Language Explanation
    ├── Risk Flag Generation
    ├── Deadline Identification
    └── Action Plan Generation
    │
    ▼
Supabase PostgreSQL (results stored per user)
    │
    ▼
Frontend renders analysis + chat interface
```

---

## Tech Stack

| Layer       | Technology                              |
|-------------|----------------------------------------|
| Frontend    | React 18, Vite, Tailwind CSS v4, TypeScript |
| Routing     | React Router v6                        |
| HTTP Client | Axios                                  |
| Backend     | Node.js, Express 4                     |
| Security    | Helmet, CORS, express-rate-limit       |
| Database    | Supabase PostgreSQL                    |
| Storage     | Supabase Storage                       |
| AI          | Google Gemini multimodal API           |
| Auth        | Supabase Auth                          |
| Frontend Deploy | Vercel                             |
| Backend Deploy  | Render (or equivalent)             |

---

## Database Schema (Phase 3)

| Table              | Purpose                                  |
|--------------------|------------------------------------------|
| `profiles`         | User profile data linked to Supabase Auth |
| `documents`        | Document metadata + storage path          |
| `extractions`      | Structured fields extracted by Gemini     |
| `validation_results` | Errors and warnings flagged             |
| `deadlines`        | Important dates parsed from documents     |
| `chat_messages`    | Per-document chat history                 |

All tables will have Row Level Security (RLS) so users can only access their own data.

---

## Security Design

- Gemini API key → backend only, never in frontend bundle
- Supabase service_role key → backend only
- Only anon key (safe, row-level-security enforced) goes to frontend
- File uploads validated for type and size before Supabase Storage
- Auth enforced via Supabase JWT — userId/documentId never trusted from client body
- IDOR prevented: all queries filter by authenticated user ID from JWT
- Helmet sets security headers on every response
- CORS locked to ALLOWED_ORIGINS env variable
- Rate limiting: 200 req / 15 min globally, tighter limits on AI endpoints

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd DocuSaathi
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your real keys
npm install
npm run dev
# Listening on http://localhost:4000
```

### 3. Set up the frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL can be left blank in dev — proxy handles it
npm install
npm run dev
# http://localhost:5173
```

### 4. Verify health endpoint

```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "docusaathi-backend",
  "version": "1.0.0",
  "timestamp": "...",
  "environment": "development"
}
```

---

## Project Phases

| Phase | Scope                                              | Status     |
|-------|----------------------------------------------------|------------|
| 1     | Project scaffold, frontend shell, backend health   | Complete   |
| 2     | Auth (Supabase), upload flow, Supabase Storage     | Pending    |
| 3     | Database schema, Supabase RLS                      | Pending    |
| 4     | Gemini AI pipeline (classify, extract, validate)   | Pending    |
| 5     | Analysis UI, deadlines, action plan                | Pending    |
| 6     | Document chat                                      | Pending    |
| 7     | Security audit, hardening                          | Pending    |
| 8     | Deploy (Vercel + Render)                           | Pending    |

---

## Environment Variables

See backend/.env.example and frontend/.env.example for full reference.

NEVER commit .env files.

---

## Folder Structure

```
DocuSaathi/
├── README.md
├── .gitignore
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── pages/
│       │   ├── LandingPage.tsx
│       │   ├── DashboardPage.tsx
│       │   └── NotFoundPage.tsx
│       ├── components/
│       ├── services/
│       │   ├── api.ts
│       │   └── healthService.ts
│       ├── hooks/
│       └── types/
└── backend/
    ├── .env.example
    ├── package.json
    └── src/
        ├── index.js
        ├── app.js
        ├── routes/
        │   ├── health.js
        │   ├── documents.js
        │   ├── analysis.js
        │   └── chat.js
        └── middleware/
            └── errorHandler.js
```
