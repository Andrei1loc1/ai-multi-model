# Multi-Model Cloud Agent

Cloud-first AI workspace built with Next.js, Supabase, OpenRouter, and optional NVIDIA Direct routing.

This project is no longer a simple multi-model prompt box. It is now an online AI workspace with:
- full conversation threads
- `Chat` and `Agent` modes
- persistent memory
- GitHub repo connection and indexing
- image attachments with vision preprocessing
- saved notes
- public API key generation
- installable PWA support
- a mobile-first chat layout while keeping the desktop workspace intact

## Core Experience

### Chat Workspace
- Thread-based chat closer to ChatGPT/Claude behavior
- Premium response renderer with sections, steps, code blocks, tables, and callouts
- Auto model routing with fallback across candidate models
- Provider selection for `OpenRouter`, `NVIDIA Direct`, or `All Providers`

### Agent Mode
- Repo-aware reasoning and drafting inside the same thread
- Draft-oriented agent artifacts for coding tasks:
  - understanding
  - files used
  - proposed changes
  - risks
  - next step
- `Apply` is still draft-oriented and does not yet automate a remote PR flow

### Memory
- Recent thread memory for follow-up questions
- Persistent memory entries across:
  - `user`
  - `workspace`
  - `conversation`
  - `repo`
- Summary-style long-term memory updates for longer threads

### Repo-Aware AI
- Create cloud workspaces
- Connect GitHub repositories by URL
- Reindex repo files into retrieval chunks
- Use repo context in explain and coding tasks

### Image Understanding
- Attach images in chat
- Upload them to Supabase Storage
- Analyze them through a vision preprocessing layer
- Pass normalized image context to the final model, even when the final model is not vision-native

### Notes
- Save an assistant answer as a note
- Browse and manage notes from the notes page

### External API
- Generate API keys
- Call the app externally through `POST /api/v1/chat`

### PWA
- Installable web app
- Cached shell for previously visited pages
- Offline fallback page

## UI Status

### Desktop
- Workspace-style layout stays the main experience
- Sidebar, thread view, provider/model controls, and premium response cards remain desktop-first visually

### Mobile
- Chat page is now mobile-first
- `AI Control` is collapsible on small screens
- Thread metadata and controls are compacted
- Composer sits higher and uses shorter placeholders
- Layout uses overflow protection and consistent dark overscroll background

## Architecture

### Frontend
- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Custom premium markdown/response renderer
- Responsive chat workspace with mobile-first refinements

### Backend
- Next.js route handlers for orchestration, workspaces, notes, image uploads, repo integration, and external API access

### Data Layer
- Supabase Postgres for:
  - workspaces
  - conversations
  - conversation messages
  - memory entries
  - repo connections
  - repo chunks
  - saved notes (`responses`)
  - API keys
  - image assets
  - image analysis cache
  - image analysis runs
- Supabase Storage for uploaded images

### AI Providers
- OpenRouter
- NVIDIA Direct

## Main Capabilities

### 1. AI Orchestration
- Task classification:
  - `chat`
  - `coding`
  - `explain`
  - `rewrite`
  - `search`
  - `plan`
- Context assembly from:
  - current message
  - recent thread
  - persistent memory
  - repo chunks
  - image context
  - saved notes
- Auto model selection with retry/fallback across models in `Auto` mode

### 2. Provider and Model Routing
- OpenRouter free models
- NVIDIA Direct models
- Provider filter in chat UI
- `Auto` can stay inside the selected provider group

### 3. Repo Integration
- Connect repo to workspace
- Fetch metadata from GitHub URL
- Index repository content into searchable chunks
- Retrieve relevant files for explain/coding flows

### 4. Image Attachments
- Upload images from the composer
- Cache image analysis by content hash
- Route image preprocessing through configured providers
- Isolate image-only questions from unrelated repo or note context

### 5. Public API
- Generate API keys from the app
- Validate keys server-side in `/api/v1/chat`
- Use prompt-only requests or override with a real model id

## Routes

### Pages
- `/`
- `/chat`
- `/notes`
- `/generateAPI`
- `/offline`

### Main API routes
- `POST /api/orchestrate/chat`
- `POST /api/v1/chat`
- `POST /api/generate-key`
- `GET/POST /api/workspaces`
- `DELETE /api/workspaces/:id`
- `POST /api/workspaces/:id/connect-repo`
- `POST /api/workspaces/:id/reindex`
- `GET /api/workspaces/:id/search`
- `GET /api/workspaces/:id/context`
- `GET/DELETE /api/workspaces/conversations/:id`
- `GET/POST /api/notes`
- `DELETE /api/notes/:id`
- `POST /api/uploads/image`
- `POST /api/images/analyze`
- `DELETE /api/images/:id`

## Project Structure

```text
app/
  api/
  chat/
  components/
    Chat/
    Navigation/
    PWA/
    Response/
    Workspace/
    notes/
  lib/
    AImodels/
    chatUtils/
    database/
    images/
    memory/
    orchestrator/
    response/
    retrieval/
    workspaces/
  manifest.ts
  offline/
public/
  pwa/
  sw.js
scripts/
  build.cjs
supabase/
  schema.sql
docs/
```

## Environment Variables

Create `.env.local` in the project root for local development.

### Required for Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### AI providers

```env
OPENROUTER_API_KEY_1=...
OPENROUTER_API_KEY_2=...
OPENROUTER_API_KEY_3=...

NVIDIA_API_KEY=...
```

Optional:

```env
OPENROUTER_VISION_MODEL=...
NVIDIA_VISION_MODEL=...
```

### GitHub access

```env
GITHUB_TOKEN=...
```

### API info page gate

```env
NEXT_PUBLIC_API_GEN_PASSWORD=...
```

Note: `NEXT_PUBLIC_API_GEN_PASSWORD` protects the info page UI, not the public chat API itself.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project and run schema

Run the SQL from `supabase/schema.sql` in the Supabase SQL Editor.

### 3. Configure environment variables

Add the variables above locally or in Vercel.

### 4. Start development

```bash
npm run dev
```

Open:
- [http://localhost:3000/chat](http://localhost:3000/chat)
- [http://localhost:3000/notes](http://localhost:3000/notes)
- [http://localhost:3000/generateAPI](http://localhost:3000/generateAPI)

## Public API Usage

### Endpoint

`POST /api/v1/chat`

### Headers

```txt
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

### Request body

Minimal request:

```json
{
  "prompt": "Tell me about AI"
}
```

With explicit model:

```json
{
  "prompt": "Explain this code",
  "model": "qwen3-coder-free"
}
```

### Example

```bash
curl -X POST "https://your-domain.vercel.app/api/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{
    "prompt": "Tell me about AI"
  }'
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Deployment

Recommended stack:
- Vercel for frontend and route handlers
- Supabase for database and storage

Make sure Vercel has the same environment variables as local development.

## Current Limits

- PWA support is focused on installability and cached shell pages, not full offline chat sync
- Repo integration is best suited for public GitHub repositories or token-backed access
- `Apply` in agent workflows is still draft-oriented
- The API info page is UI-gated, but production-grade auth around key management can still be tightened further

## Summary

This repo now represents an online AI workspace rather than a basic chat client. It combines:
- multi-provider model routing
- persistent conversation memory
- repo-aware AI assistance
- image understanding
- note capture
- public API access
- installable PWA behavior
- a responsive mobile-first chat experience
