# Sprite Generation Guide

This project can optionally place collectibles inside the maze. The browser app
loads those collectibles from a sprite sheet stored at:

`collectibles-sprite.png`

## Asset requirements

- The file must live in the repository root
- The filename must be exactly `collectibles-sprite.png`
- The sprite sheet must contain exactly 10 frames
- Every frame must be square
- Frames must be arranged in a regular grid
- Frames must not overlap
- Use a transparent background
- Keep padding around each character so it remains readable at small sizes
- Do not include labels, UI elements, borders, or watermarks

Recommended layout:

- `5 x 2` grid
- Equal frame width and height for every sprite
- Center each character inside its frame
- Use strong silhouettes and high contrast colors

Valid pixel sizes for a `5 x 2` sheet:

- `1280 x 512`
- `1600 x 640`
- `2000 x 800`

## Art direction

The current collectible system works best with:

- Cute or readable fantasy creature designs
- Distinct shapes so each collectible is easy to tell apart
- Clean outlines
- Strong separation between the character and the transparent background
- A style that still reads clearly when scaled down to fit a maze cell

Avoid:

- Dense backgrounds
- Tiny facial details that disappear at small sizes
- Muted palettes with weak contrast
- Existing copyrighted characters

## Recommended prompt

Use a prompt in this shape when generating the sprite sheet:

```text
A game-ready sprite sheet PNG for a maze collectible system: 10 original fantasy
creature icons inspired by creature-capture games, but not any existing
copyrighted characters. Arrange exactly 10 separate square frames in a clean 5
columns by 2 rows grid. Every frame must be the same size and aligned perfectly
for cropping. Each creature should be distinct, cute, readable at small size,
and themed like elemental fantasy monsters. Front-facing or 3/4 view, high
contrast silhouettes, polished 2D game art, crisp outlines, vivid colors, no
text, no UI, no extra objects, no overlap between frames, transparent
background, consistent padding inside each square, export as a sprite sheet.
```

## Programmatic generation

`generate-sprite.py` creates a ready-to-use sprite sheet using Python and
Pillow. It produces a 1280 × 512 PNG with 10 square frames (256 × 256 each)
arranged in a 5 × 2 grid. The sheet includes: star, gem, crown, key,
lightning bolt, flower, mushroom, snowflake, moon, and compass.

**Requirements**

```
pip install Pillow
```

**Run**

```bash
python3 generate-sprite.py
```

The script writes `collectibles-sprite.png` to the project root and prints the
output path on success. No arguments are needed.

**Customising**

Each frame is drawn by a dedicated function (`frame_star`, `frame_gem`, etc.)
near the top of the script. Edit fill colors, shapes, or swap in a new
function to change individual sprites. The palette constants at the top of the
file (`GOLD`, `RUST`, `BLUE`, …) match the app's color tokens.

## Workflow

1. Generate a PNG sprite sheet with transparent background.
2. Verify that there are exactly 10 square frames.
3. Save the file as `collectibles-sprite.png` in the project root.
4. Open the maze app.
5. Enable `Add collectibles`.
6. Generate a maze and confirm the collectibles appear in the preview.
7. Use `Toggle solution` and verify the solution path visits every collectible
   before reaching the exit.

## Fallback behavior

If `collectibles-sprite.png` is missing, or if the app cannot interpret it as a
10-frame square sprite sheet, the app falls back to numbered collectible
markers. This keeps the collectible logic usable while the artwork is still in
progress.
