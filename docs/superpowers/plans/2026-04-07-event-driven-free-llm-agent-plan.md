# Event-Driven Free-LLM Agent Implementation Plan

Date: 2026-04-07

## Objective

Implement an event-driven agent system for virtual projects that works better with free LLM providers by adding phase orchestration, file-aware validation, automatic retries, and real-time activity visibility.

## Delivery Strategy

Implementation is split into shared foundation work and three parallel workstreams, followed by integration and verification.

## Phase 0: Shared Foundation

These pieces should land before or at the start of parallel execution because the later tracks depend on them.

### 0.1 Define agent run contracts

Files:

- `app/lib/workspaces/types.ts`
- new `app/lib/agents/runs.ts` or equivalent

Tasks:

- add types for agent runs, phases, validator outcomes, and activity events
- define event payload shapes for live streaming
- define structured planner/worker/judge payload contracts

### 0.2 Decide transport

Files:

- `app/api/orchestrate/chat/route.ts`
- possibly new streaming route under `app/api/agent-runs/...`

Tasks:

- choose SSE as the first transport for server-to-client activity streaming
- keep existing JSON response path for backward compatibility
- define a run id lifecycle

### 0.3 Create deterministic analyzer helpers

Files:

- new `app/lib/virtualProjects/analyzer.ts`
- new `app/lib/virtualProjects/validators.ts`

Tasks:

- detect React entry candidates
- detect imported CSS files
- extract JSX class names
- extract CSS selectors
- return editable-file recommendations

## Workstream A: Backend Pipeline

Primary goal: create the event-driven agent run engine.

Files:

- `app/lib/orchestrator/service.ts`
- `app/api/orchestrate/chat/route.ts`
- new `app/lib/agents/pipeline.ts`
- new `app/lib/agents/events.ts`

Tasks:

1. split current orchestrator into stages:
   - intent
   - planning
   - editing
   - validation
   - preview decision
   - retry decision
   - finalization
2. emit activity events from each stage
3. support create, edit, and repair modes for virtual projects
4. scope worker prompts to specific files whenever analyzer can determine them
5. add retry loop with a hard max of 2 retries

Notes:

- do not move all logic into the route handler
- keep orchestration logic in library code and keep the route thin

## Workstream B: Project Analysis And Validation

Primary goal: reduce model mistakes before and after edits.

Files:

- new `app/lib/virtualProjects/analyzer.ts`
- new `app/lib/virtualProjects/validators.ts`
- `app/lib/virtualProjects/reactRuntime.ts`
- `app/lib/orchestrator/service.ts`

Tasks:

1. build analyzer snapshot from current project files
2. add validator rules for:
   - entry existence
   - import resolution
   - imported CSS coherence
   - JSX/CSS class drift
   - preview compatibility
3. return validator results in machine-readable form
4. feed validator failures into retry instructions
5. add simple preview heuristics where deterministic checks are enough

Notes:

- this workstream owns the "free model compensation" layer
- validator output must stay stable because UI and retries will consume it

## Workstream C: Live Activity UI

Primary goal: let the user see project modifications and agent progress in real time.

Files:

- `app/chat/ChatUI.tsx`
- `app/components/Workspace/VirtualProjectPanel.tsx`
- new `app/components/Workspace/AgentActivityPanel.tsx`
- `app/components/Chat/ConversationThread.tsx`

Tasks:

1. add local run state for agent activity
2. subscribe to run events from SSE
3. show current phase, retry count, and validator outcomes
4. surface touched files live
5. update the visible virtual project state incrementally as file updates arrive
6. keep final chat answer short and let the activity panel carry operational detail

Notes:

- `ChatUI.tsx` is the integration bottleneck and should be edited by one owner at a time
- activity UI should not duplicate the entire chat thread

## Workstream D: Persistence And Recovery

Primary goal: make runs inspectable and resilient enough for refresh/reopen behavior.

Files:

- `app/lib/workspaces/service.ts`
- optional schema updates in `supabase/schema.sql`
- optional new API routes for run retrieval

Tasks:

1. add storage helpers for run metadata and optional run events
2. preserve last known good project when retries fail
3. attach successful run metadata back to the conversation/project
4. optionally persist recent event log for refresh continuity

Notes:

- this workstream can start in-memory if schema expansion would slow down the first milestone
- if persisted, keep event records lightweight

## Integration Sequence

1. land Phase 0 contracts
2. land Workstream B analyzer/validator foundation
3. land Workstream A pipeline with event emission
4. land Workstream C UI subscription and live panels
5. land Workstream D persistence/recovery
6. wire final integration through `ChatUI.tsx`

## Parallelization Rules

Safe parallel ownership:

- Workstream A owns orchestration and API
- Workstream B owns analyzer, validators, and preview-related validation helpers
- Workstream C owns UI surfaces and client run state
- Workstream D owns persistence and storage helpers

High-conflict files:

- `app/lib/orchestrator/service.ts`
- `app/chat/ChatUI.tsx`

These files should have a single owner at a time during integration.

## Verification Plan

### Functional scenarios

1. create a React virtual project and watch phase events stream live
2. edit the same project and confirm same `projectId` is reused
3. trigger a recoverable styling drift and confirm auto-repair retry runs
4. trigger an invalid import and confirm validator catches it before finalization
5. create a Python virtual project and confirm non-React path still works

### Technical checks

- targeted ESLint for touched files
- `npx tsc --noEmit`
- `npm run build`

### UX checks

- touched files update before final answer arrives
- validator failures are understandable in UI
- retries are visible, not hidden
- final chat answer stays concise

## First Milestone Recommendation

Ship the first milestone with:

- analyzer
- validators
- in-memory event stream
- activity panel
- retry loop

Defer full event persistence until the flow feels right.

## Expected Outcome

After this plan, the app should feel materially more agentic:

- users watch work happen
- the system catches common mistakes before finalizing
- follow-up edits stay on the same project
- free LLM variability is softened by structure rather than hidden behind chat prose
