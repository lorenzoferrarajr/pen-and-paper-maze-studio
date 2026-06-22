# PRODUCT

## Summary

Maze Generator is a lightweight browser tool for creating printable and screen-sized maze puzzles with meaningful difficulty variation, deterministic generation behavior, and one-click PNG export. The product should feel fast, approachable, and tactile, like a focused puzzle studio rather than a developer utility.

## Register

`product`

## Users

- Parents creating puzzles for children at home
- Teachers preparing printable activities for classrooms
- Puzzle fans generating quick mazes for tablets, paper, or casual play

## Core jobs

- Pick a target surface such as screen, iPad, A5, A4, or Letter
- Generate a maze that fits that surface without manual layout work
- Tune difficulty and maze density with a small set of understandable controls
- Export a clean PNG that is ready to print or share

## Product intent

The interface should make maze generation feel immediate and dependable. It should reward quick experimentation, keep configuration understandable, and avoid the visual language of a technical dashboard. Design serves clarity first, delight second.

## UX principles

1. Keep the control set compact and readable. Every visible control must materially change the result.
2. Preserve strong visual hierarchy between configuration, maze preview, and export actions.
3. Prefer auto-derived layout behavior over manual setup whenever the target surface is known.
4. Make output trust obvious: the maze should look centered, intentional, and ready to use.
5. Treat the preview as the product, not as a placeholder for export.

## Design direction

- Warm, crafted, paper-adjacent, but still crisp on screens
- Editorial typography with strong readability, not game UI or childish novelty
- A grounded palette with dark ink, warm neutrals, and a restrained accent
- Motion, if used, should feel subtle and useful rather than decorative

## Anti-directions

- Do not turn the interface into a generic admin panel
- Do not use loud arcade styling, neon puzzle-game tropes, or cartoon classroom visuals
- Do not overload the form with technical or rarely useful controls
- Do not let export-focused options crowd out the preview experience

## Interaction expectations

- The maze should refresh quickly after intentional user changes
- Page and device presets should reduce manual work, not add more knobs
- Export and print actions should stay visible and unambiguous
- Layout hints should explain mode behavior in plain language

## Accessibility

- Text contrast must stay comfortably above WCAG minimums
- Controls must remain legible and operable on laptops and tablets
- Labels should use plain language, especially for size and export-related actions
- Motion must remain optional and respect reduced-motion preferences

## Current surface in focus

- `index.html` is the whole product surface: UI, styling, generation logic, and export behavior

## Notes for future design work

- If the product grows, prefer improving preset logic, preview clarity, and export trust before adding more configuration
- Keep the product feeling like a polished puzzle tool, not a configurable rendering engine
