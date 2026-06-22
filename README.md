# Japanese Flashcard Print Generator

A fast, dependency-free web app for creating printable Japanese flashcard sheets. Each A4 landscape sheet contains a 5 x 5 grid of 25 cards with matching front and back pages for duplex printing.

## Features

- Large Japanese text and bottom-left romaji on card fronts
- Centered Turkish meanings on card backs
- Normal and horizontally mirrored back layouts
- Print Test Mode with matching `01-25` alignment numbers
- Exact A4 landscape print dimensions (`297mm x 210mm`)
- JSON save and load
- Automatic local browser storage
- Readable Japanese UI fonts with Noto Sans JP and system fallbacks

## Run locally

Open `index.html` in a modern browser. No installation or build step is required.

## Print

1. Fill in the card editor.
2. Select **Normal** or **Mirrored for duplex** for the back layout.
3. Use **Print Test Mode** first to check your printer's duplex alignment.
4. Select **Print / Save PDF**.
5. In the print dialog, choose A4 landscape, 100% or actual-size scaling, and no margins. Disable fit-to-page.

The generated print output contains two pages: fronts followed by matching backs.

## Privacy

Card data stays in your browser unless you explicitly export a JSON file.
