# Changelog

All notable changes to StickPad are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-10

First public release.

### Added
- **Notes**: Markdown editor with live preview, KaTeX math, `[[wiki links]]` with backlinks, tags, colours, pinning, autosave, templates (Cornell, lecture, paper summary, stock analysis, daily log), clickable checklists, embedded graphs (`![[chart:ID]]`), citations (`[@key]`), focus mode and export to `.md`.
- **Graphs**: bar, line, area, scatter, pie, doughnut and radar charts from pasted CSV or Excel data, trend lines with R², stacked and logarithmic axes, a safe function plotter, column statistics and PNG export.
- **Finance**: compound growth (nominal and inflation-adjusted), budget tracker with CSV import, portfolio tracker, loan amortization with extra payments, NPV / IRR / payback, Monte Carlo portfolio simulation, FIRE calculator and Black-Scholes pricing with Greeks.
- **Portfolio live prices** with your own free API key (Finnhub, Alpha Vantage or Twelve Data). The key is tested before it is saved, stays in the local database and is never included in exports.
- **Study**: SM-2 spaced-repetition flashcards (generated from notes via `Q :: A` lines and `{{cloze}}` words), Pomodoro timer that keeps running across pages, and tasks with priorities, undo and inline editing.
- **Subjects & marks**: record marks per subject, see progress charts, and get a study-time balance analysis that flags subjects being left behind or over-studied.
- **Research**: source library with APA, MLA, Chicago and BibTeX citations, bibliography export and reading-note generator.
- **Lab**: descriptive statistics, linear regression, normal distribution explorer, grade planner and scientific calculator.
- **Dashboard** with streak, activity heatmap, due cards, tasks and quick capture; global search (Ctrl+K).
- **English and Spanish** interface, tutorial and demo data, with a language switcher.
- Demo data that can be loaded and removed separately from your own data, plus a guarded "delete all data" action.
- JSON export and import of all data.
- Classic light and dark themes, lightweight animations, skeleton loading placeholders and a layout that adapts to the window size.
- **Desktop build**: a self-contained Linux AppImage with its own SQLite database stored under `~/.local/share/StickPad`.

[Unreleased]: https://github.com/joaquinhoppe/stickpad/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/joaquinhoppe/stickpad/releases/tag/v1.0.0
