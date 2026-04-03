# Premium Response Renderer Design

## Goal
Replace the current plain markdown response surface with a premium, semantically structured renderer that feels closer to ChatGPT and Claude while staying strong for coding and technical answers.

The target experience is:
- premium and clean
- easy to scan
- balanced information density
- strong for long-form technical answers
- resilient when the model output is messy or only partially structured

## Design Direction
The chosen direction is a smart semantic renderer rather than simple markdown polish.

Visual goals:
- hybrid premium style between ChatGPT and Claude
- balanced density, not too airy and not too cramped
- strong visual hierarchy for explanations, steps, and code
- restrained color use with more emphasis on spacing, typography, and panel structure

## Core Architecture
The response system will be split into three layers.

### 1. Response Surface
The response container becomes a premium reading surface with:
- controlled reading width
- cleaner outer chrome
- improved padding and section spacing
- better code block framing
- elegant scrolling behavior

This applies to both chat responses and saved notes where possible.

### 2. Semantic Parsing Layer
A lightweight parser will inspect the model response before rendering.

It should detect stable patterns such as:
- intro or executive answer
- headings and sections
- ordered steps
- key bullet groups
- warnings, recommendations, and next steps
- code blocks
- tables
- quotes

The parser must be conservative. If structure is unclear, it must fall back to safe markdown rendering instead of guessing aggressively.

### 3. Premium Block Renderers
Each semantic block gets a specialized renderer:
- narrative text block
- section header
- steps block
- key points block
- callout block
- code block panel
- table block
- quote block
- inline chips for code and paths

## Parsing Strategy
The parser should remain rule-based for v1.

Recommended approach:
- split markdown into block groups
- detect fenced code blocks first
- detect headings by markdown syntax
- detect numbered lists and convert them into step groups
- detect bullet clusters and convert strong top-level groups into key points
- detect callout prefixes like `important`, `warning`, `note`, `recommendation`, `next step`
- preserve unknown content as markdown paragraphs

This keeps behavior predictable and avoids overfitting to one model style.

## Rendering Rules
### Intro Block
If the response starts with a short direct answer or summary paragraph, render it as a stronger lead paragraph.

### Section Blocks
Headings should become clear section dividers with:
- stronger font weight
- tighter heading spacing
- subtle separators or spacing rhythm

Avoid rainbow heading colors or decorative gradients on every heading.

### Steps
Ordered lists that look instructional should render as premium steps:
- compact numeric badge
- aligned content column
- slightly separated items
- easy scanability for implementation or action flows

### Key Points
Bullet clusters should render as structured key points:
- reduced visual noise compared to default bullets
- stronger spacing consistency
- better readability for multi-point answers

### Callouts
Callouts should be auto-detected when signals are strong and rendered as:
- `Important`
- `Warning`
- `Recommendation`
- `Next step`

Each gets a restrained visual tone rather than loud color blocks.

### Code Blocks
Code requires first-class treatment:
- dedicated panel shell
- language label
- copy button
- consistent line numbers
- cleaner syntax contrast
- good horizontal scrolling

Code panels should look premium but remain highly legible for real coding work.

### Tables
Tables should render flatter and cleaner than default markdown:
- strong header row
- soft row separators
- good spacing
- no heavy boxed-grid look

### Quotes
Quotes should feel editorial and intentional, not generic italic markdown.

## Component Plan
Recommended new components:
- `ResponseRenderer`
- `ResponseLead`
- `ResponseSection`
- `ResponseSteps`
- `ResponseKeyPoints`
- `ResponseCallout`
- `ResponseCodeBlock`
- `ResponseTable`

Existing markdown rendering remains useful as the fallback layer.

## File Plan
Primary files to change:
- `app/components/Chat/ChatWindow.tsx`
- `app/components/MarkDown/MarkDownViewer.tsx`
- `app/styles/markdown.css`
- `app/globals.css`

New files likely needed:
- `app/components/Response/ResponseRenderer.tsx`
- `app/components/Response/ResponseBlocks.tsx`
- `app/lib/response/parseResponse.ts`
- `app/lib/response/types.ts`

Optional reuse target:
- `app/components/notes/Note.tsx`

## Fallback Behavior
The system must degrade gracefully.

Fallback rules:
- short plain text stays simple and premium
- partially structured content uses mixed semantic + markdown rendering
- unknown structures remain readable markdown
- malformed markdown must never break the response surface

## UX Constraints
- must work well on desktop and mobile
- must not reduce coding readability in favor of decoration
- must not make short answers feel oversized
- must keep copy/paste behavior intact
- must support long answers without looking bloated

## Testing Plan
Test with these response shapes:
- short direct answer
- long explanatory answer with headings
- ordered implementation steps
- mixed explanation plus code
- warning plus recommendation
- table-heavy output
- low-quality messy markdown

Success criteria:
- response is easier to scan than current renderer
- code is easier to read and copy
- sections feel intentional rather than accidental
- output remains robust across different model styles

## Risks
- over-detecting semantics and harming faithful rendering
- making simple answers look too “framed”
- too many custom block styles creating visual clutter

Mitigations:
- conservative parser
- strong markdown fallback
- limited number of premium block types

## Implementation Recommendation
Build the semantic parser and premium blocks first for chat responses, then reuse the same system in notes after validating the chat experience.
