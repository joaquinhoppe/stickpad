# StickPad

A local-first workbench for **studying, research and finance**, built with **Flask** (API, SQLite, finance/stat maths) and **Vue 3** (no build step; all libraries are vendored so it works offline).

## Download (Linux AppImage)

Grab `StickPad-<version>-x86_64.AppImage` from the [Releases page](https://github.com/joaquinhoppe/stickpad/releases), then:

```bash
chmod +x StickPad-*.AppImage
./StickPad-*.AppImage
```

It opens in its own window (uses Chrome/Chromium/Brave/Edge in app mode if installed, otherwise your default browser) and exits when you close it. Your data is stored in `~/.local/share/StickPad/stickpad.db`, so it survives updates; back it up by copying that file. Built on Ubuntu 26.04 (glibc 2.43), so it needs a reasonably recent Linux.

Build it yourself with `./scripts/build_appimage.sh` (needs Python 3 and internet on the first run).

## Run from source

```bash
./run.sh            # or: pip install -r requirements.txt && python app.py
# open http://localhost:5000  →  Dashboard → "Load demo data"
```

`PORT=8080 ./run.sh` changes the port; `STICKPAD_DB=/path/x.db` moves the database.

## Features

- **Notes** – Markdown + KaTeX math, `[[wiki links]]` with backlinks, tags, templates, pinning, autosave, outline, focus mode, clickable checkboxes, embedded graphs (`![[chart:ID]]`), citations (`[@key]`), export to `.md`.
- **Graphs** – bar/line/area/scatter/pie/doughnut/radar from pasted CSV, trend lines with R², log axes, stacked series, a safe **function plotter** (`sin(x); x^2/10`), column statistics, PNG export.
- **Finance** – compound growth (nominal vs real), budget tracker with CSV import, portfolio with live quotes (bring your own free Finnhub / Alpha Vantage / Twelve Data API key, set in the app), loan amortization with extra payments, NPV/IRR/payback, Monte Carlo simulation, FIRE calculator, Black–Scholes with Greeks.
- **Study** – SM-2 spaced-repetition flashcards (auto-generated from notes via `Q :: A` and `{{cloze}}`), Pomodoro timer that persists across pages, tasks with priorities, and a subjects & marks tracker that charts progress per subject and flags the ones being left behind or over-studied.
- **Research** – source library, APA/MLA/Chicago/BibTeX citations, bibliography export, reading-note generator.
- **Lab** – descriptive statistics, linear regression, normal distribution explorer, grade planner, scientific calculator.
- **Bilingual UI** – English / Spanish switcher (sidebar), including the tutorial and demo data. Clean, classic theme with light and dark modes, lightweight animations and skeleton loading placeholders.
- **Dashboard** – streak, activity heatmap, due cards, quick capture. **Ctrl+K** global search, dark mode, JSON export/import.

The full walkthrough is in [TUTORIAL.md](TUTORIAL.md) (also shown in the app under **Help**).

## Layout

```
app.py          Flask API (generic JSON document store + SM-2, finance, stats, citations)
seed.py         demo data
static/         Vue 3 SPA (index.html, js/v-*.js views, css, vendor/ libs)
TUTORIAL.md / TUTORIAL.es.md   user tutorial (EN / ES)
static/js/i18n*.js            translation engine + Spanish dictionary
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Releases follow semantic versioning; the current version is in `VERSION`.
