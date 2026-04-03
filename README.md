# Multi-Model Cloud Agent

Cloud-first AI workspace built with Next.js, Supabase, OpenRouter, and optional NVIDIA Direct routing.

The app is no longer just a simple multi-model chat. It now works as an online AI workspace with:
- full conversation threads
- `Chat` and `Agent` modes
- workspace-level memory
- GitHub repo connection and indexing
- image attachment analysis
- saved notes
- external API key generation
- installable PWA shell

## What It Does

### Chat Workspace
- Full thread-based chat, closer to ChatGPT-style conversations
- Premium response renderer with structured sections, code blocks, tables, and callouts
- Auto model routing with fallback across candidate models
- Provider selection for `OpenRouter`, `NVIDIA Direct`, or `All Providers`

### Memory
- Short-term working memory from recent conversation turns
- Persistent memory entries for:
  - `user`
  - `workspace`
  - `conversation`
  - `repo`
- Conversation summary refresh for longer threads

### Repo-Aware AI
- Create cloud workspaces
- Connect public GitHub repositories
- Reindex repo files into retrieval chunks
- Use repo context in `Agent` mode and explain/code tasks

### Image Understanding
- Attach images in chat
- Upload to Supabase Storage
- Analyze them through a vision preprocessing layer
- Pass normalized image context into the final model, even if the final model is not vision-native

### Notes
- Save assistant answers as notes
- Browse and manage notes from the notes page

### External API
- Generate API keys
- Call the app externally through `POST /api/v1/chat`

### PWA
- Installable web app
- Cached app shell for previously visited pages
- Offline fallback page

## Current Architecture

### Frontend
- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Custom premium markdown/response renderer

### Backend
- Next.js route handlers for orchestration, notes, workspaces, image uploads, and external API access

### Data Layer
- Supabase Postgres for:
  - workspaces
  - conversations
  - conversation messages
  - memory entries
  - repo connections
  - repo chunks
  - notes
  - api keys
  - image assets
  - image analysis cache/runs
- Supabase Storage for uploaded images

### AI Providers
- OpenRouter
- NVIDIA Direct

## Main Features by Area

### 1. AI Orchestration
- Task classification: `chat`, `coding`, `explain`, `rewrite`, `search`, `plan`
- Context assembly from:
  - current message
  - recent thread
  - persistent memory
  - repo chunks
  - image context
  - saved notes
- Auto model selection with retriable fallback in `Auto` mode

### 2. Provider and Model Support
- OpenRouter free models
- NVIDIA Direct models
- Separate provider selector in chat UI
- Auto mode can stay inside the selected provider when desired

### 3. Agent Workflow
- `Chat` mode for direct answers
- `Agent` mode for repo-aware reasoning and draft code planning
- Draft-oriented agent artifact generation:
  - understanding
  - files used
  - proposed changes
  - risks
  - next step

### 4. GitHub Repo Integration
- Connect repo to workspace
- Fetch metadata from GitHub URL
- Index repository content into searchable chunks
- Retrieve relevant files for explain/coding tasks

### 5. Image Attachments
- Upload images from the chat composer
- Cache image analysis by content hash
- Vision fallback flow across configured providers
- Better isolation of image-only questions from unrelated repo/note context

## Project Structure

```text
app/
  api/
    ai/
    compress/
    generate-key/
    images/
    notes/
    orchestrate/chat/
    uploads/image/
    v1/chat/
    workspaces/
  chat/
  components/
    Chat/
    Navigation/
    PWA/
    Response/
    Workspace/
    notes/
  lib/
    agents/
    AImodels/
    chatUtils/
    database/
    images/
    memory/
    orchestrator/
    response/
    retrieval/
    utils/
    workspaces/
  manifest.ts
  offline/
public/
  pwa/
  sw.js
supabase/
  schema.sql
scripts/
docs/
```

## Environment Variables

Create [`.env.local`](C:\Users\Andrei\Desktop\ai-multi-model\.env.local) with the values you use locally.

### Required for cloud data

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

### GitHub repo access

```env
GITHUB_TOKEN=...
```

### API info page password

```env
NEXT_PUBLIC_API_GEN_PASSWORD=...
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project and run schema

Run the SQL from [supabase/schema.sql](C:\Users\Andrei\Desktop\ai-multi-model\supabase\schema.sql) in the Supabase SQL Editor.

### 3. Add environment variables

Add the variables above locally or in Vercel.

### 4. Start development

```bash
npm run dev
```

Open:
- [http://localhost:3000/chat](http://localhost:3000/chat)
- [http://localhost:3000/notes](http://localhost:3000/notes)
- [http://localhost:3000/generateAPI](http://localhost:3000/generateAPI)

## API Usage

### Public chat endpoint

`POST /api/v1/chat`

Headers:

```txt
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

Body:

```json
{
  "prompt": "Tell me about AI"
}
```

Or with a real model id:

```json
{
  "prompt": "Explain this code",
  "model": "qwen3-coder-free"
}
```

Example:

```bash
curl -X POST "https://your-domain.vercel.app/api/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -d '{
    "prompt": "Tell me about AI"
  }'
```

## Development Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Important Notes

- `.env.local` is ignored by git and should never be committed
- PWA support currently focuses on installability and cached shell pages, not full offline chat sync
- Repo integration is currently best suited for public GitHub repositories or token-backed access
- `Apply` in agent workflows is still draft-oriented, not a full remote PR automation flow

## Deploy

Recommended stack:
- Vercel for frontend and route handlers
- Supabase for database and storage

Make sure Vercel has the same environment variables as local development.

## Summary

This repo now represents an online AI workspace rather than a basic chat client. It combines:
- multi-provider model routing
- conversation memory
- repo-aware AI assistance
- image analysis
- note capture
- installable PWA behavior

If you want, the next README improvement I can make is adding screenshots and a short architecture diagram.
