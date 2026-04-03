# Chat Top Strip Navigation Design

## Goal
Replace the floating dropdown navigation in the chat page with a compact horizontal navigation strip placed in the top-left corner, aligned to the same width as the workspace sidebar.

## Current Problem
- The current navigation is a floating toggle button with a dropdown menu.
- It occupies the top-left corner awkwardly and feels detached from the workspace layout.
- It can visually compete with the chat header and wastes the reserved corner space above the sidebar.

## Desired Outcome
- A compact horizontal navigation strip sits above the workspace sidebar.
- The strip width matches the sidebar width.
- Navigation no longer uses a dropdown or overlay.
- The chat header on the right remains clean and unobstructed.

## Scope
This change affects only the navigation presentation and related layout spacing.

Included:
- Replace floating nav toggle with inline horizontal navigation strip
- Remove dropdown navigation behavior from chat layout
- Align nav strip with sidebar column
- Preserve active route highlighting
- Keep the design compact and consistent with the existing dark premium UI

Excluded:
- Changing route structure
- Adding new pages
- Redesigning the sidebar content itself

## Layout
### Desktop
- A small rounded navigation card appears at the top of the left column
- The strip is the same width as the workspace sidebar
- The workspace sidebar stays directly underneath it
- The right content column starts alongside the left column as before

### Mobile
- The same component is reused
- Items can wrap or remain horizontally scrollable if needed
- No dropdown or modal is used

## Navigation Items
The strip should expose the main pages:
- Chat
- Notes
- API

Each item should include:
- a small icon
- a short label
- clear active state

## Visual Design
- Rounded container matching the current workspace card language
- Compact vertical height
- Soft border and subtle background blur
- Active item uses a brighter filled treatment
- Inactive items remain low-contrast but readable
- No explanatory subtitle text

## Component Changes
### `app/components/Navigation/Navbar.tsx`
- Convert from floating toggle button to horizontal nav strip
- Render route items directly
- Detect active route and style selected item

### `app/components/modals/NavbarModal.tsx`
- Remove from chat navigation flow
- Can be left unused temporarily or simplified if still referenced elsewhere

### `app/components/Workspace/WorkspaceSidebar.tsx`
- Reduce top margin because the nav strip now occupies the top-left space above it
- Keep visual spacing between nav strip and sidebar card tight and intentional

### `app/chat/ChatUI.tsx`
- Ensure the left column visually reads as:
  1. navigation strip
  2. workspace sidebar
- No overlap with the main title card

## Interaction
- Clicking a nav item navigates immediately
- Active page is visually obvious
- No menu opening/closing state is needed

## Risks
- If the nav strip is too tall, it will recreate the spacing problem it is meant to solve
- If item labels are too long, the left column may feel crowded on smaller screens

## Validation
- Chat page has no floating nav button anymore
- Navigation stays in the top-left corner above the sidebar
- Width matches the sidebar column
- Active route styling works
- No overlap with the title card or workspace controls
- Mobile layout remains usable
