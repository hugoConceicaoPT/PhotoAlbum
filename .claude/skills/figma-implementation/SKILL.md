---
name: figma-implementation
description: Implements the existing Figma designs in the React and TypeScript application while preserving visual consistency and responsive behavior.
---

# Figma Implementation

## Purpose

Translate supplied Figma designs into accurate, reusable React components.

## Design source

The existing Figma design is the primary visual reference.

The only Figma file agents must use as the design source is **PhotoMemory – Redesign**. Do not use any other Figma file, draft or page as a visual reference. If the file or a needed frame cannot be found or accessed through the Figma MCP, stop and report it instead of guessing.

Figma file URL: https://www.figma.com/design/CTIhmSkm8zDbhpWQuGIeiB/PhotoMemory-%E2%80%93-Redesign (fileKey: `CTIhmSkm8zDbhpWQuGIeiB`). Use this fileKey with the Figma MCP tools (call `create_session` first, then `get_metadata`, `get_design_context`, `get_screenshot`, `get_variable_defs`). The file has a single top-level page (`0:1`); ask for a node-specific URL (`?node-id=`) when a particular frame is needed.

When Figma MCP is unavailable or rate limited, work from the local screenshots in `assets/` and `docs/design/figma-reference.md`, following the "Local Design References" rules in `CLAUDE.md`. Do not guess fonts, spacing or other values that screenshots cannot verify; record them as open questions.

Do not independently redesign screens unless explicitly requested.

## Before implementation

1. Inspect the relevant Figma frames.
2. Identify page layouts.
3. Identify reusable components.
4. Review typography.
5. Review colors and spacing.
6. Identify icons and assets.
7. Identify interactive states.
8. Identify responsive variations.
9. Inspect existing frontend components.
10. Identify opportunities to reuse existing code.

## Implementation requirements

Match the supplied design as closely as reasonably possible.

Pay attention to:

- Layout.
- Spacing.
- Typography.
- Font weights.
- Colors.
- Borders.
- Shadows.
- Component dimensions.
- Alignment.
- Icons.
- Images.
- Responsive behavior.
- Interactive states.

## React implementation

- Use functional React components.
- Use TypeScript.
- Reuse existing components.
- Avoid unnecessary duplication.
- Keep components focused.
- Follow the existing styling approach.
- Preserve application routing and state conventions.

## Responsive behavior

Implement layouts that work across the screen sizes specified by the design.

Do not assume desktop-only behavior.

## Interactive behavior

Implement relevant states, including:

- Hover.
- Focus.
- Active.
- Disabled.
- Loading.
- Error.
- Empty.
- Success.

## Missing design information

If a required design detail is unavailable:

- Do not invent a major design decision.
- Use existing project conventions where reasonable.
- Document the assumption.
- Ask the orchestrator when clarification is needed.

## Verification

Compare the implemented interface against the supplied design.

Check:

- Visual alignment.
- Spacing.
- Typography.
- Component behavior.
- Responsive layouts.
- Accessibility.

## Completion criteria

The implementation must:

- Follow the supplied Figma design.
- Reuse appropriate existing components.
- Work responsively.
- Follow project conventions.
- Have relevant frontend tests.