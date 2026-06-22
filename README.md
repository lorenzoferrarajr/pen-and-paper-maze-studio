# Maze Generator

A self-contained static app that generates pen-and-paper style mazes and renders
them as printable PNG images.

## Features

- Generates a perfect maze using recursive backtracking
- Opens at the top-left edge and exits at the bottom-right edge
- Manual mode for explicit rows and columns
- Page mode for A5, A4, or Letter output with automatic row and column sizing
- Difficulty presets that choose between simpler or more deceptive maze layouts
- Adjustable cell size, stroke width, and optional seed
- Download the result as PNG or print directly from the browser
- Ships as a single `index.html`, ready for GitHub Pages

## Run locally

Because the app is fully self-contained, you can open `index.html` directly in a
browser or serve it with any static host.

For a local server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Push the repo to GitHub and enable Pages for the branch that contains
`index.html`. No build step is required.

## Usage

Open the page, set the maze options and optional seed, then:

- select `Generate` to create a new maze
- select `Download PNG` to save a bitmap copy
- select `Print` to print directly from the browser

## Difficulty

The app provides three difficulty presets:

- `Easy` now starts at the old medium behavior: it evaluates several candidate mazes and avoids the most obvious layouts.
- `Medium` uses the previous hard-style search, favoring longer solutions, more side branches, and fewer obvious corridors.
- `Hard` pushes further by evaluating even more candidates and biasing strongly toward twistier, more deceptive layouts.

When a seed is provided, the selected difficulty remains deterministic as well.

## Generate a printable PDF

If you also want a PDF from the command line, run:

```bash
node generate-maze-pdf.mjs maze.pdf --columns 20 --rows 20 --seed demo
```

Optional flags:

- `--cell-size 20`
- `--stroke-width 2`
- `--page-size a4` or `--page-size letter`
- `--margin 36`
- `--show-solution`
