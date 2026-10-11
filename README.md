# StickPad

A local-first workbench for **studying, research and finance**, built with **Flask** (API, SQLite, finance/stat maths) and **Vue 3** (no build step; all libraries are vendored so it works offline).

## Run

```bash
./run.sh            # or: pip install -r requirements.txt && python app.py
# open http://localhost:5000  →  Dashboard → "Load demo data"
```

`PORT=8080 ./run.sh` changes the port; `STICKPAD_DB=/path/x.db` moves the database.

## Features

- **Notes** – Markdown + KaTeX math, `[[wiki links]]` with backlinks, tags, templates, pinning, autosave, outline, focus mode, clickable checkboxes, embedded graphs (`![[chart:ID]]`), citations (`[@key]`), export to `.md`.
- **Graphs** – bar/line/area/scatter/pie/doughnut/radar from pasted CSV, trend lines with R², log axes, stacked series, a safe **function plotter** (`sin(x); x^2/10`), column statistics, PNG export.
- **Finance** – compound growth (nominal vs real), budget tracker with CSV import, portfolio with live quotes, loan amortization with extra payments, NPV/IRR/payback, Monte Carlo simulation, FIRE calculator, Black–Scholes with Greeks.
- **Study** – SM-2 spaced-repetition flashcards (auto-generated from notes via `Q :: A` and `{{cloze}}`), Pomodoro timer that persists across pages, tasks with priorities.
- **Research** – source library, APA/MLA/Chicago/BibTeX citations, bibliography export, reading-note generator.
- **Lab** – descriptive statistics, linear regression, normal distribution explorer, grade planner, scientific calculator.
- **Bilingual UI** – English / Spanish switcher (sidebar), including the tutorial and demo data. Glossy glass theme with light and dark modes.
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
