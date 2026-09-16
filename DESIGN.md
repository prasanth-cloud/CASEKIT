# CaseKit Design System

## Product experience
CaseKit should feel like a mature professional workspace, not a generic AI dashboard. Optimize for repeated daily use, speed, readability, information hierarchy, consistency, and low cognitive load.

## Visual direction
- Neutral white or subtle off-white application background.
- Slightly differentiated neutral sidebar.
- Near-black primary text and muted gray secondary text.
- One restrained accent color for primary actions, links, selections, and important indicators.
- Prefer 1px borders and whitespace over decorative containers.
- Moderate border radii.
- Shadows only for functional elevation such as menus, dialogs, and popovers.
- No decorative gradients, glassmorphism, glowing effects, or random colored icons.

## Typography and density
Use a compact professional hierarchy with a small number of type sizes. Page titles must not be oversized. Metadata should be smaller and muted. Tables and lists should be moderately dense and easy to scan. Avoid huge whitespace and oversized cards.

## Application shell
Use a persistent collapsible left sidebar with:
- Home
- Cases
- Documents
- Tasks
- Calendar
- Contacts
- AI Assistant

Settings and account controls belong toward the bottom. Navigation should remain visually quiet with consistent icons and subtle selected states.

## Home
Do not fill the page with meaningless statistic cards. Prioritize recently accessed cases, upcoming deadlines, tasks requiring attention, recent activity, and documents requiring action. Users should understand what needs attention within five seconds.

## Cases
Default to a compact table/list with search, filters, sorting, useful saved views, status, client, responsible person, important date/deadline, and recent activity. Clicking a row opens the case workspace.

## Case workspace
Header: case name/number, client, status, and important actions.

Navigation: Overview | Documents | Timeline | Tasks | Notes | AI

Overview shows the most useful information first rather than everything at once.

## Documents
Documents are first-class. Where appropriate use a three-region layout: navigation/list | document/content | contextual details. Secondary panels should collapse so the document remains the focus.

## AI
AI is contextual rather than a separate gimmick. Useful actions include summarization, extracting important information, identifying deadlines, searching case material, asking questions about the current case, and drafting. Prefer a contextual side panel/drawer when conversational AI is needed.

## Tables
Use compact rows, clear alignment, subtle separators, restrained hover states, and sticky headers for long datasets. Badges are reserved for actual status/categorical information.

## Forms
Use persistent labels above fields. Group related fields logically. Include helper text, validation, and clear error recovery.

## Interaction states
Relevant components must support default, hover, focus, selected, disabled, loading, empty, error, and success states. Animation should improve comprehension, not decorate.

## Design tokens
Maintain reusable tokens for colors, typography, spacing, border radius, borders, shadows, icon sizing, and component heights. Buttons, forms, tables, dropdowns, tabs, dialogs, and navigation must share the same visual language.

## Responsive behavior
Desktop is primary. Tablet remains fully functional. Mobile prioritizes essential workflows instead of compressing the desktop UI unchanged.

## Anti-patterns
Avoid excessive rounded cards, cards nested inside cards, huge headings, gradients, purple/blue AI backgrounds, glowing elements, excessive shadows, excessive pills, random colored icons, meaningless dashboard statistics, decorative charts, excessive whitespace, and unnecessary animation.

Every visible element must communicate information, establish hierarchy, or enable an action.

## Redesign process
Do not redesign the entire application in one pass. Inspect existing routes/components first and preserve working functionality. Implement one representative screen—preferably Cases—then review it before propagating the system. Once approved, convert decisions into reusable components/tokens and migrate remaining screens progressively.
