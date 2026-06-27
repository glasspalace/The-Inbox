# Parallax

Video-first conversations with people who hold opposing views on curated topics. Omegle-style matching with AI moderation and Exa-powered factual context.

## Stack

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 + LiveKit
- **Backend**: Fastify + WebSocket + Redis + PostgreSQL
- **AI**: OpenAI (moderation + claim extraction), Exa (fact-checking)

## Quick start

### 1. Infrastructure

```bash
docker compose up -d
```

### 2. Environment

```bash
cp .env.example apps/api/.env
# Add LIVEKIT_*, EXA_API_KEY, OPENAI_API_KEY as needed
```

### 3. Install & run

```bash
npm install
npm run build -w @parallax/shared
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

## User flow

1. Landing → value survey (10 questions)
2. Topic picker → queue
3. Matched with ideological opposite → video + text chat
4. Skip / report / feedback

## Demo mode

Without LiveKit credentials, matching and text chat work in demo layout. Configure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` for full video.

## Docs

See [docs/PRD.md](docs/PRD.md) for the full product requirements document.

## Project structure

```
apps/web/          # Temp frontend (replaceable UI)
apps/api/          # Fastify API, matching, moderation, Exa
packages/shared/   # Shared types and survey scoring
```
