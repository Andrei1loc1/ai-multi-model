# Virtual Projects Browser Sandbox Implementation Plan

## Objective
Implement the v1 Virtual Projects MVP defined in `docs/superpowers/specs/2026-04-06-virtual-projects-browser-sandbox-design.md`.

The delivered feature should let Agent mode:
- generate a persistent React or Python virtual project
- attach it to the active conversation
- reopen it later in the same workspace thread
- preview React projects in-browser
- run simple Python scripts in-browser with Pyodide
- download the project as ZIP

## Delivery Strategy
Use a phased plan with isolated workstreams. Parallel work is safe only after the shared contract layer lands.

### Phase 0: Contract And Schema Baseline
This phase must land first because every other track depends on the same data contract.

Tasks:
1. Extend shared types for virtual project records, files, summaries, and assistant metadata references.
2. Add Supabase schema for:
   - `virtual_projects`
   - `virtual_project_files`
3. Extend database record types in the Supabase client module.
4. Add service helpers to create, load, list, and update virtual projects.
5. Define the orchestrator output contract for `virtualProject`.

Files:
- `app/lib/workspaces/types.ts`
- `app/lib/database/supabase.ts`
- `app/lib/workspaces/service.ts`
- `app/lib/orchestrator/service.ts`
- `supabase/schema.sql`

Exit criteria:
- types compile
- the service layer can persist and read a project with files
- assistant responses can carry a stable `virtualProject` summary or `virtualProjectId`

## Parallel Workstreams
After Phase 0, split into two implementation tracks plus one utility track with minimal file overlap.

### Track A: API And Orchestrator Persistence
Scope:
- persist validated virtual project payloads when agent generation returns runnable output
- load latest project for a conversation
- expose fetch and ZIP download routes

Files:
- `app/lib/orchestrator/service.ts`
- `app/api/orchestrate/chat/route.ts`
- `app/api/workspaces/conversations/[id]/route.ts`
- `app/api/virtual-projects/route.ts`
- `app/api/virtual-projects/[id]/route.ts`
- `app/api/virtual-projects/[id]/download/route.ts`
- `app/lib/virtualProjects/validate.ts`
- `app/lib/virtualProjects/archive.ts`

Key decisions:
- `Conversation GET` should return `latestProject` alongside `conversation` and `messages`
- assistant message metadata should store only a lightweight project reference, not full file contents
- ZIP download should read from persisted files, not from client state

Exit criteria:
- sending a qualifying agent prompt can save a project
- reloading a conversation returns `latestProject`
- ZIP route downloads a valid archive

### Track B: Workspace UI And Thread Integration
Scope:
- make the main workspace aware of the active virtual project
- render inline message affordances for opening the saved project
- add a persistent project panel to the chat workspace

Files:
- `app/chat/ChatUI.tsx`
- `app/components/Chat/ChatWindow.tsx`
- `app/components/Chat/ConversationThread.tsx`
- `app/components/Workspace/AgentPanel.tsx` or replacement with `VirtualProjectPanel.tsx`
- `app/components/Workspace/VirtualProjectPanel.tsx`
- `app/components/Workspace/VirtualFileTree.tsx`
- `app/components/Workspace/VirtualCodeViewer.tsx`

Key decisions:
- keep `ConversationThread` thread-first and lightweight
- move persistent project state ownership into `ChatUI`
- replace the current single `result` dependency with:
  - `latestResult`
  - `activeProjectSummary`
  - `activeProjectDetail`
- render the project panel beside the thread on desktop and stacked below it on mobile

Exit criteria:
- selecting a conversation restores its latest project
- an assistant message can reopen the project panel
- files can be browsed without leaving the thread view

### Track C: Browser Runtime And Preview
Scope:
- render React projects from virtual files inside the browser
- run Python scripts through Pyodide
- surface logs and runtime errors to the panel

Files:
- `app/components/Workspace/VirtualProjectPreview.tsx`
- `app/lib/virtualProjects/reactRuntime.ts`
- `app/lib/virtualProjects/pythonRuntime.ts`

Optional support files if needed:
- `app/lib/virtualProjects/constants.ts`
- `app/lib/virtualProjects/logs.ts`

Key decisions:
- keep the React import whitelist to `react` and `react-dom`
- lazy-load preview runtimes only when the `Preview` tab opens
- keep run state local to the panel, then optionally persist last run summary through the project API

Exit criteria:
- React preview renders a valid generated project
- Python execution shows stdout or stderr
- runtime failures stay inside panel logs and do not break the chat page

## Integration Phase
This phase happens after Tracks A, B, and C are individually complete.

Tasks:
1. Wire `ChatUI` to load `latestProject` from conversation responses.
2. Connect the project panel to the preview runtime modules.
3. Connect download action to the ZIP route.
4. Ensure follow-up agent turns update the same project when appropriate.
5. Preserve compatibility with historical assistant messages that do not include project metadata.

Files:
- `app/chat/ChatUI.tsx`
- `app/components/Workspace/VirtualProjectPanel.tsx`
- `app/components/Chat/ConversationThread.tsx`
- `app/lib/orchestrator/service.ts`

Exit criteria:
- generate -> persist -> reopen -> preview -> refine -> download works in one conversation

## Validation And Test Pass
Focus on the highest-risk paths first.

### Required Checks
1. Schema migration applies cleanly.
2. A generated React project persists and reloads.
3. A generated Python script runs in-browser.
4. ZIP output contains the persisted files with correct paths.
5. Conversation history without projects still loads correctly.

### Recommended Automated Coverage
- payload validation for invalid file paths, duplicate paths, missing entry file
- latest-project selection logic per conversation
- ZIP generation
- basic UI state transitions for opening project, switching tabs, and showing runtime errors

## Safe Parallelization Rules
To keep agent-driven execution organized:
- do not run multiple agents against `app/chat/ChatUI.tsx` at the same time
- do not start frontend integration before Phase 0 types are merged
- keep Track A and Track C independent until the preview component contract is fixed
- reserve final integration for one coordinating agent

## Recommended Agent Assignment
Agent 1:
- Phase 0 shared types and schema
- Track A backend routes and persistence

Agent 2:
- Track B workspace UI and thread integration

Agent 3:
- Track C browser preview runtimes and logs

Coordinator:
- merge contracts
- run integration phase
- handle final verification

## Order Of Execution
1. Land Phase 0.
2. Freeze the shared TypeScript contract.
3. Run Track A, Track B, and Track C in parallel with non-overlapping ownership.
4. Merge into one branch and complete the Integration Phase.
5. Run validation and fix cross-track regressions.

## Main Risks
- `ChatUI.tsx` is currently the main coordination bottleneck and must not be edited in parallel by multiple agents.
- `AgentPanel.tsx` is currently unused, so blindly extending it without first mounting it in `ChatUI` will waste effort.
- conversation reload flow currently reconstructs state from message metadata, so the plan must explicitly add `latestProject` to the conversation API response.
- browser preview tooling can easily become over-scoped if React runtime support expands beyond the strict whitelist.

## Definition Of Done
- project artifacts are persistent conversation assets, not transient response text
- the chat workspace exposes a usable project panel
- React and Python previews both work inside browser-safe limits
- follow-up prompts can refine the same project
- the user can download the current virtual project as ZIP
