# Full Conversation Workspace Design

## Goal
Refactor the chat page from a single-response surface into a full conversation workspace that behaves like a modern chatbot thread.

The new experience should:
- preserve every user and assistant message in the active conversation
- load full history when a recent conversation is selected
- append new turns to the same thread instead of replacing the previous answer
- keep the premium assistant renderer for assistant replies
- integrate agent-mode outputs inline inside the assistant message rather than in a dominant side panel

## Product Direction
The chat page should feel closer to ChatGPT or Claude:
- thread-first conversation model
- premium message presentation
- sticky composer at the bottom
- recent conversations switch entire threads, not just latest-answer previews

The right-side context panel should stop being the center of gravity for the page. The conversation feed becomes the main product surface.

## Core UX
### Conversation Canvas
The central panel becomes a scrollable feed of messages in chronological order.

Message types:
- user
- assistant
- optional system/internal status in future

Each conversation thread should show all previous turns.

### Recent Conversations
Selecting an item from Recent Conversations should:
- load the conversation record
- load the conversation messages
- switch workspace and mode to match that thread
- render the entire thread in the center
- scroll to the latest message

### Sending a New Message
When the user sends a new prompt:
- keep the existing thread visible
- append the new user turn
- append the assistant response after orchestration returns
- keep the selected conversation active
- do not replace earlier responses

### Empty State
If the selected conversation has no messages yet:
- show a refined empty state
- keep the composer visible and ready

## Message Design
### User Messages
User messages should be:
- visually compact
- clearly distinct from assistant messages
- optimized for scanability, not decoration

### Assistant Messages
Assistant messages should:
- use the premium semantic renderer
- support long technical answers
- support code, tables, callouts, and structured sections
- keep the `AI Answer` badge

### Agent Mode in Thread
Agent mode should not rely on a dominant separate panel.

Instead, assistant messages should include rich inline blocks when relevant:
- understanding
- files used
- proposed changes
- patch or code
- risks
- next step

The side panel can remain secondary or be reduced later, but the thread must stand on its own.

## State Model
Current UI state is centered around a single `response`.

This should be replaced by thread-first state:
- `messages: ConversationMessage[]`
- `selectedConversationId`
- `selectedWorkspaceId`
- `mode`
- `loading`

The previous `response` value can remain temporarily for compatibility if needed, but the main rendering path should come from `messages`.

## Data Flow
### Load Conversations
When the page loads:
- fetch workspaces
- fetch recent conversations
- if a conversation is selected, fetch its messages

### Load Thread
When `selectedConversationId` changes:
- request conversation metadata + messages
- map them into thread UI state

### Send Flow
Recommended v1 send flow:
1. append optimistic user message locally
2. call orchestration
3. append returned assistant answer locally
4. refresh conversation/workspace metadata

This gives the correct chat feel even before any future streaming improvements.

## Components
Recommended components:
- `ConversationThread`
- `ConversationMessage`
- `UserBubble`
- `AssistantBubble`
- `ComposerBar`
- `ConversationHeader`

Likely refactors:
- `ChatWindow` becomes thread renderer
- `ChatUI` becomes thread/state orchestrator

## File Plan
Primary files:
- `app/chat/ChatUI.tsx`
- `app/components/Chat/ChatWindow.tsx`

New files likely:
- `app/components/Chat/ConversationThread.tsx`
- `app/components/Chat/ConversationMessage.tsx`
- `app/components/Chat/ComposerBar.tsx`

Support files:
- `app/api/workspaces/conversations/[id]/route.ts`
- `app/lib/workspaces/service.ts`

## Interaction Rules
- selecting a conversation should never appear to “do nothing”
- sending a new message should never wipe visible history
- thread order should always remain chronological
- assistant formatting should remain premium and stable
- scrolling should favor the latest turn while preserving manual reading

## Migration Approach
Implement in phases:

1. thread state in `ChatUI`
2. thread renderer in chat center
3. send flow append behavior
4. recent conversation full-load behavior
5. optional reduction of redundant side-panel content

## Risks
- temporary duplication between old `response` state and new `messages` state
- loading race conditions when switching conversations quickly
- agent output duplication between thread and side panel

Mitigations:
- make `messages` the source of truth
- cancel outdated loads on conversation switch
- treat side-panel data as secondary derived UI

## Success Criteria
- selecting a recent conversation shows the whole thread
- new messages append to the same thread
- previous turns remain visible
- assistant responses still render with the premium semantic styling
- the chat page feels like a real chatbot workspace rather than a latest-response viewer
