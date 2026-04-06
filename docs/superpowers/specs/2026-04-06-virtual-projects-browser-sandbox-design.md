# Virtual Projects Browser Sandbox Design

## Goal
Add a new Agent mode capability that can generate, persist, preview, rerun, and download browser-safe mini projects directly inside the current workspace conversation.

The first version should support:
- multi-file React mini apps
- simple Python scripts executed in the browser with Pyodide
- project persistence per conversation and workspace
- ZIP download of the generated project
- follow-up refinement of the same project in later messages

The first version should not support:
- arbitrary `npm install`
- backend code execution
- OS-level Python automation
- access to the real local filesystem
- package installation inside Python

## Product Direction
The feature should feel like an evolution of the current Agent mode, not a separate tool.

Today the agent returns draft-oriented coding artifacts inside the thread. This design adds a new artifact type: `virtual project`.

The user should be able to ask for:
- "make me a mini React app"
- "build a landing page"
- "create a small Python automation"
- "change the previous app to use a dashboard layout"

The assistant should respond in-thread as usual, but also attach a persistent project artifact that the user can inspect and download.

## Chosen Approach
Use a browser-native sandbox for both supported project types.

### React Projects
React projects should run inside an isolated browser preview that consumes virtual files from application state. The preview must allow only a fixed whitelist of imports for v1.

### Python Projects
Python projects should run inside Pyodide in the browser. The runtime should support simple computation and text/data transformation use cases, not system automation.

### Why This Approach
- fastest path to a safe MVP
- no server-side arbitrary code execution
- fits the current Next.js and Supabase architecture
- keeps project generation, storage, and preview under the same product surface

## Core UX
### New Artifact Type
Agent mode should be able to return either:
- the current draft coding artifact
- a `virtual project` artifact
- both, when the request benefits from an explanation plus runnable output

### Project Surface
The project surface should live inside the existing chat workspace and feel attached to the assistant turn that created or updated it.

Recommended tabs:
- `Overview`
- `Files`
- `Preview`
- `Logs`

Recommended actions:
- `Run`
- `Download ZIP`
- `Open latest project`

### Follow-Up Editing
If a conversation already has a latest virtual project, a follow-up request such as "make the hero section cleaner" or "add CSV parsing" should update that same project unless the user clearly asks for a new one.

### Empty And Failure States
If preview cannot run:
- keep the project visible
- show the files that were generated
- show a clear runtime or validation error in `Logs`
- keep ZIP download available when the file set is valid enough to export

## Data Model
Use dedicated tables for virtual projects rather than burying everything inside `conversation_messages.metadata`.

### `virtual_projects`
Fields:
- `id`
- `workspace_id`
- `conversation_id`
- `source_message_id`
- `kind` with values `react-app` or `python-script`
- `title`
- `prompt`
- `status` with values `ready`, `running`, `error`
- `entry_file`
- `preview_mode` with values `react` or `pyodide`
- `manifest_json`
- `last_run_summary`
- `last_error`
- `created_at`
- `updated_at`

### `virtual_project_files`
Fields:
- `id`
- `project_id`
- `path`
- `language`
- `content`
- `is_entry`
- `sort_order`
- `created_at`
- `updated_at`

### Run History In V1
V1 should not add a separate `virtual_project_runs` table. It should store only the latest run summary and latest error on the `virtual_projects` row.

## Persistence Rules
- every project belongs to exactly one conversation
- a project may also belong to a workspace when the conversation is workspace-backed
- the assistant message should still contain human-readable explanation
- the persistent project record is the source of truth for preview and ZIP export
- the latest project id can be echoed into assistant message metadata for easier thread rendering

## Agent Output Contract
The orchestrator should gain a structured `virtualProject` payload for generation tasks that ask for runnable output.

Recommended shape:

```ts
type VirtualProjectPayload = {
  kind: "react-app" | "python-script";
  title: string;
  summary: string;
  entryFile: string;
  previewMode: "react" | "pyodide";
  files: Array<{
    path: string;
    language: string;
    content: string;
  }>;
  runInstructions?: string[];
};
```

The backend must validate:
- allowed project kinds
- normalized file paths
- no duplicate file paths
- required entry file exists
- file count and content size caps
- only allowed React import specifiers in v1

If validation fails, the system should fall back to a normal assistant response and omit the project artifact.

## Runtime Model
### React Preview
The React runtime should:
- read files from in-memory state
- resolve only a whitelist of imports
- compile or evaluate in-browser for preview
- render inside an isolated preview frame
- report compile and runtime errors into `Logs`

V1 import whitelist:
- `react`
- `react-dom`

### Python Preview
The Python runtime should:
- load Pyodide lazily
- execute the selected entry file in an isolated worker or browser execution context
- capture stdout and stderr
- enforce a timeout
- expose no custom helper APIs in v1

V1 should support:
- string processing
- JSON parsing and transformation
- simple list and dict manipulation
- lightweight numeric logic

V1 should not support:
- subprocesses
- filesystem access outside virtual input/output objects
- arbitrary package installation

## API And Service Changes
### Orchestrator
`app/lib/orchestrator/service.ts` should:
- detect requests that should produce a virtual project
- ask the model for the structured project payload
- validate and persist the payload
- return project metadata alongside the normal assistant answer

### Workspace Services
`app/lib/workspaces/service.ts` should gain helpers to:
- create a virtual project
- update the latest virtual project in a conversation
- list projects for a conversation
- load a project with files
- persist latest run status and errors

### New Route Handlers
Recommended new routes:
- `GET /api/virtual-projects/:id`
- `POST /api/virtual-projects`
- `GET /api/virtual-projects/:id/download`

V1 should not add a `run` API route. Preview execution should happen in the browser and client code can persist latest run status back through the existing project update flow if needed.

## UI Changes
### Chat State
`app/chat/ChatUI.tsx` should load the latest project artifact for the selected conversation and keep it in sync with new assistant turns.

### Agent Presentation
`app/components/Workspace/AgentPanel.tsx` should evolve from a text-only execution summary into a project-aware panel that can show:
- summary
- file tree
- code viewer
- preview frame
- logs

### Thread Rendering
`app/components/Chat/ConversationThread.tsx` should be able to render assistant messages that reference a saved virtual project and provide an affordance to reopen it.

## Suggested File Plan
Primary existing files:
- `app/chat/ChatUI.tsx`
- `app/components/Workspace/AgentPanel.tsx`
- `app/components/Chat/ConversationThread.tsx`
- `app/lib/orchestrator/service.ts`
- `app/lib/workspaces/service.ts`
- `app/lib/workspaces/types.ts`
- `supabase/schema.sql`

Likely new files:
- `app/api/virtual-projects/[id]/route.ts`
- `app/api/virtual-projects/route.ts`
- `app/api/virtual-projects/[id]/download/route.ts`
- `app/components/Workspace/VirtualProjectPanel.tsx`
- `app/components/Workspace/VirtualFileTree.tsx`
- `app/components/Workspace/VirtualCodeViewer.tsx`
- `app/components/Workspace/VirtualProjectPreview.tsx`
- `app/lib/virtualProjects/validate.ts`
- `app/lib/virtualProjects/archive.ts`
- `app/lib/virtualProjects/reactRuntime.ts`
- `app/lib/virtualProjects/pythonRuntime.ts`

## Validation And Error Handling
### Validation
Reject and explain:
- invalid project kind
- missing entry file
- duplicate paths
- path traversal patterns
- too many files
- oversized files
- unsupported React imports

### Runtime Errors
Show user-facing messages for:
- React compile errors
- React runtime exceptions
- Pyodide load failures
- Python execution timeout
- invalid generated code structure

Errors should be surfaced as compact product UI, not raw stack dumps by default.

## Security Constraints
- no execution of arbitrary server-side code
- no access to local machine files
- no unrestricted dependency installation
- no import of non-whitelisted packages in React preview
- no Python subprocess or shell access
- no silent network side effects in preview by default

## Testing Strategy
### Unit Tests
Add focused coverage for:
- virtual project payload validation
- path normalization
- ZIP archive generation
- latest-project selection logic in a conversation

### UI Tests
Cover:
- creating a new project from agent mode
- reopening a persisted project after thread reload
- switching between `Files`, `Preview`, and `Logs`
- showing runtime error states without collapsing the workspace

### Manual Acceptance
Validate these end-to-end scenarios:
1. ask for a React mini app and see a live preview
2. ask for a Python script and see stdout in logs
3. reload the conversation and reopen the same project
4. refine the project in a follow-up prompt
5. download the project as ZIP

## Risks
- browser React runtime integration may become brittle if import handling is too ambitious in v1
- Pyodide startup latency may feel heavy on slower devices
- large generated files may harm preview responsiveness
- mixing old draft-agent artifacts and new project artifacts could create UI confusion

## Mitigations
- keep the React import whitelist minimal in v1
- lazy load runtimes only when the project preview is opened
- cap project size aggressively
- visually distinguish `draft patch` from `virtual project`

## V1 Scope
Include:
- React multi-file virtual projects
- Python browser-safe script projects
- persistence by conversation and workspace
- preview and logs
- ZIP download
- follow-up updates to the latest project

Exclude:
- arbitrary npm dependencies
- backend sandbox execution
- OS automation
- real cron or background job execution
- multi-user collaboration
- project version history and rollback

## Success Criteria
- a user can ask for a React mini app and preview it in the same thread
- a user can ask for a simple Python script and run it in-browser
- generated projects persist across conversation reloads
- the same project can be refined through follow-up prompts
- the project can be downloaded as ZIP without leaving the workspace
