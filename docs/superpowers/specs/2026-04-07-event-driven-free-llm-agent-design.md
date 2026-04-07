# Event-Driven Free-LLM Agent Design

Date: 2026-04-07

## Goal

Upgrade the current chat + virtual project flow into a visibly agentic system that works well with free LLM providers by relying on orchestration, deterministic validation, retry logic, and live activity streaming instead of expecting one-shot model perfection.

The user should be able to:

- ask for a new mini app or edit an existing virtual project
- see in real time what the agent is doing
- see which files were touched as the work happens
- get automatic repair retries when preview or validation fails
- end with a runnable virtual project more often, even when the underlying free model is inconsistent

## Non-Goals

- local model execution
- backend arbitrary code execution sandbox
- perfect zero-error generation
- full multi-user concurrency control
- general-purpose agent autonomy outside the current chat/workspace model

## Product Direction

The system should stop behaving like "chat that sometimes emits code" and start behaving like an event-driven agent pipeline.

The chat response becomes a summary, while the primary work is exposed through:

- activity timeline
- touched files
- validation results
- retry state
- refreshed preview state

## Core Architecture

### 1. Intent Router

Decides whether the user request is:

- create virtual project
- edit existing virtual project
- repair existing virtual project
- explain current project
- normal non-project chat

This decision should prefer existing project continuity in agent mode. If a conversation already has a virtual project, ordinary follow-up requests should default to project editing rather than plain conversational answers.

### 2. Project Analyzer

Build a deterministic project snapshot before asking the model to edit.

For React projects, snapshot should include:

- preferred runtime entry file
- import graph
- imported CSS files
- JSX class names
- CSS selectors
- likely editable files

For Python projects, snapshot should include:

- effective entry file
- imported local modules
- candidate edit files

This snapshot is used to constrain and inform the worker model.

### 3. Agent Pipeline

Every project task runs through explicit stages:

1. planning
2. editing
3. validating
4. previewing
5. repairing (retry 1)
6. repairing (retry 2)
7. finalizing

The pipeline should support early success. If validation and preview pass after the first edit, the run finalizes immediately.

### 4. Deterministic Validators

Validators have higher authority than the model.

Initial validator set:

- entry file exists and is preview-compatible
- imports resolve
- CSS files modified are actually imported
- JSX/CSS contract is coherent
- no clearly orphaned renamed selectors after style edits
- preview build succeeds
- recent runtime error is cleared or explained

These validators should be extensible and run independently from the model output format.

### 5. Live Activity Stream

The UI should receive a real-time event stream for each agent run.

Event types should include:

- run started
- phase changed
- planner summary
- file selected
- file updated
- validator passed
- validator failed
- preview started
- preview passed
- preview failed
- retry scheduled
- run completed
- run failed

## LLM Strategy For Free Providers

The system should use logic to compensate for lower model consistency.

### Planner

Small output, strict JSON, limited responsibility:

- intent
- target files
- edit summary
- validator focus

### Worker

Edits only the explicitly scoped files and returns structured changed-file payloads instead of regenerating the full project whenever possible.

### Judge

Used only after deterministic validation fails or the preview looks broken by machine-detectable heuristics. The judge explains what is wrong in terms of project structure and proposes a targeted retry instruction.

## Retry Policy

Default retry behavior:

- maximum 2 automatic retries
- only for recoverable failures
- each retry must narrow scope based on validator results

Examples of recoverable failures:

- invalid entry file
- CSS/JSX drift
- unresolved local import
- preview runtime error with known cause

Examples of non-recoverable failures:

- empty model output
- unusable project after multiple retries
- contradictory file graph state

## UX Expectations

### Chat

Chat should remain concise:

- what changed
- whether retries happened
- whether preview is ready

### Activity Panel

New surface adjacent to the virtual project:

- current phase
- touched files
- latest validator results
- retry count
- live event log
- project diff summary

### Files Surface

The files panel should update as edits land, not only after final completion.

## Data Model

The existing `virtual_projects` and `virtual_project_files` persistence should remain the source of truth for project state.

Additional persisted or transient records should represent:

- agent run
- agent run events
- retry count
- validator outcomes

If persistence cost is undesirable at first, event logs may start in memory with optional Supabase persistence added later.

## Error Handling

If the pipeline fails:

- preserve the last known good project state
- expose validator and preview errors in the activity surface
- provide a concise final chat message describing the failure point

The system should not silently overwrite a working project with a broken state without surfacing validator failure.

## Success Criteria

The upgrade is successful when:

- project follow-up edits reliably stay on the same virtual project
- users can see live touched-file updates during a run
- common React styling and entry-file mistakes are automatically repaired
- free-model quality variability is noticeably reduced by orchestration
- the experience feels like an agent run, not a chat reply with extra panels

## Risks

- over-orchestration may increase latency if phases are too heavy
- poor event granularity may create noisy UI without adding clarity
- validator rules that are too strict can reject valid creative output
- latest-project heuristics remain vulnerable to concurrent session races until an explicit active project id is introduced
