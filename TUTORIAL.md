# StickPad Tutorial

StickPad is a personal workbench for **studying, research and finance**. It runs locally (Flask + Vue), stores everything in one SQLite file (`data/stickpad.db`) and works offline (except live stock prices).

> **Fastest start:** go to **Dashboard → Load demo data**. You get notes, flashcards, transactions, graphs and sources to poke at while you read this.

## 1. Tour in 30 seconds

| Page | What it's for |
|---|---|
| **Dashboard** | Streak, cards due, tasks, activity heatmap, quick capture |
| **Notes** | Markdown notes with math, wiki-links, embedded graphs, citations |
| **Graphs** | Charts from pasted data, function plotter, trend lines, PNG export |
| **Finance** | Compound growth, budget, portfolio, loans, NPV/IRR, Monte Carlo, FIRE, options |
| **Study** | Spaced-repetition flashcards, Pomodoro timer, tasks |
| **Research** | Source library, APA/MLA/Chicago/BibTeX citations |
| **Lab** | Statistics, regression, normal distribution, grade planner, calculator |

Press **Ctrl+K** anywhere for global search and page jumping. At the bottom of the sidebar you can toggle light/dark mode and switch the interface between **English (EN)** and **Spanish (ES)**; the choice is remembered, and this tutorial and the demo data follow it.

## 2. Notes

Notes are Markdown and autosave while you type. Layout modes: *Split*, *Edit*, *Preview*; is distraction-free focus mode.

### Syntax cheat-sheet

| You type | You get |
|---|---|
| `# Heading`, `**bold**`, `*italic*`, `- list` | standard Markdown (tables, code, quotes too) |
| `$E=mc^2$` and `$$\int_0^1 x^2dx$$` | inline / display **LaTeX math** (KaTeX) |
| `[[Other note]]` | **wiki-link** (red = doesn't exist yet; click to create) |
| `#finance` in text | clickable tag filter |
| `- [ ] task` | checkbox you can click in the preview |
| `![[chart:3]]` | embeds graph #3 live (use the "Embed graph" menu) |
| `[@smith2020]` | citation → "(Smith & Doe, 2020)", linked to the source library |
| `Term :: Definition` | a flashcard line |
| `The {{answer}} is hidden` | a cloze flashcard |

### Workflow tips
1. Pick a **template** (Cornell, Lecture, Paper summary, Stock analysis, Daily log) before pressing ＋.
2. Write the lecture; mark facts as `Question :: Answer`.
3. Press **Make cards**. They go into a deck named after the note. Re-running never duplicates cards.
4. The **Backlinks** panel at the bottom shows which notes link here; **Outline** lists your headings.
5. Pin important notes; colour-code with the colour picker; export a note as `.md`.

## 3. Graphs

1. **＋ New graph**, choose a type: `bar`, `line`, `area`, `scatter`, `pie`, `doughnut`, `radar` or `function`.
2. Paste data (straight from Excel/Sheets works) – first row = headers, first column = labels:

   ```
   Year,Revenue,Profit
   2021,130,18
   2022,160,25
   ```
3. Options: **trend line** (linear regression with R² for scatter), stacked, log-scale Y. Column statistics appear below the chart (mean, min, max, % change first→last).
4. **Function plotter**: choose `function` and enter e.g. `sin(x); x^2/10; ncdf(x)` (use `;` for several curves) with an x-range. Supported: `+ - * / ^ %`, `sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs ln log log2 exp floor ceil round fact min max ncdf npdf erf`, constants `pi e`. Implicit multiplication (`2x`, `3sin(x)`) works.
5. **Save**, then **Download PNG** or **Copy note embed** and paste into a note.

## 4. Finance

All calculators recompute with *Enter* or their button.

- **Compound**: lump sum + monthly savings, with an inflation-adjusted ("real") line. Shows the rule-of-72 doubling time.
- **Budget**: log income (+) and expenses (−) with categories; monthly cash-flow bars and a spending doughnut update automatically. Import bank CSVs (`date,description,amount,category`).
- **Portfolio**: add tickers (`AAPL`), shares and cost. For live prices open **API settings**, pick a provider (**Finnhub**, **Alpha Vantage** or **Twelve Data**; all have a free plan), paste *your own* API key and press **Save & test**. The key is checked before it is saved, stays only in your local database and is never included in exports. Then *Refresh prices* fetches quotes and "chart" shows price history (history needs Alpha Vantage or Twelve Data). No key? Type prices by hand. Allocation doughnut included.
- **Loan**: payment, total interest and the whole schedule; add an *Extra / month* to see interest saved.
- **NPV/IRR**: cash flows like `-10000, 3000, 4000, 4500` at a discount rate → NPV with accept/reject, IRR and payback period.
- **Monte Carlo**: 1,000+ random market paths show a *range* (10th–90th percentile) of outcomes and the probability of reaching a target. Try raising volatility to see the funnel widen.
- **FIRE**: the number you need (spending ÷ withdrawal rate) and years to reach it.
- **Options**: Black–Scholes call/put, delta, gamma, vega, theta and a profit-at-expiry chart.

> Educational tools, not financial advice. Models assume constant returns/volatility.

## 5. Study

### Flashcards (spaced repetition)
Open **Study → Flashcards → Review**. Click the card (or press **Space**) to flip, then rate yourself: **1 Again · 2 Hard · 3 Good · 4 Easy**. The button labels preview the next interval. StickPad uses the **SM-2** algorithm – easy cards return after longer and longer gaps, forgotten ones reappear in the same session. Do your due cards daily to protect your 🔥 streak.

Add cards by hand, by bulk import (`question :: answer` per line) or from notes. Cards render Markdown and math.

### Focus timer
Pomodoro with custom lengths and a subject label. The timer **keeps running while you switch pages**, shows the countdown in the browser tab title and plays a sound/notification when a block ends. Completed focus blocks are logged and charted per day and per subject.

### Tasks
Add tasks with due dates, priority and subject. Overdue tasks turn red and appear on the dashboard.

### Subjects & marks
Open **Study → Subjects & marks**.

1. Add your **subjects** with a target percentage (the average you want in each).
2. Record every **mark** with its score, what it is out of (10, 100…), a weight (an exam can count more than a quiz) and a date. Marks are converted to percentages.
3. Read the results:
   - **Marks over time** (with optional trend lines) shows who is improving and who is slipping.
   - **Study time vs. where you need it** compares the share of your focus time each subject got in the last 30 days with the share it *should* get. The recommendation grows with the gap to your target and with falling marks.
   - **Weekly focus minutes** shows how your time moved across subjects.
   - The **Summary** table and the highlighted cards flag subjects that *need attention* (low or falling marks but little study time) and subjects that are *over-focused* (already above target but taking a lot of time).
4. For the time analysis, start Pomodoro sessions with the **same subject name** (the Focus timer suggests your subjects).

## 6. Research

1. **＋ Source**, fill in authors as `Last, First; Last, First`, year, title, journal, DOI.
2. After saving you see live **APA / MLA / Chicago / BibTeX** versions to copy.
3. Cite from a note via **Cite** or by typing `[@lastnameYEAR]` (the key is shown on each source).
4. **Create reading note** makes a structured note linked to the source.
5. **Bibliography** generates the full reference list in the chosen style → copy or download (`.bib` for LaTeX).

## 7. Lab

- **Statistics**: paste numbers → mean, median, mode, σ, quartiles, IQR, skew, 95% CI, outlier fences, histogram.
- **Regression**: paste x and y → slope, intercept, r, R², t-stat, prediction for any x.
- **Normal dist.**: z-scores and probabilities P(X≤a), P(a≤X≤b) with a shaded bell curve.
- **Grade planner**: what do you need on the final to reach your target grade?
- **Calculator**: scientific scratchpad with history and `ans`.

## 8. Data & backup

- **Help → Export** downloads everything as JSON; **Import** merges a previous export.
- **Delete demo data** removes only what *Load demo data* created (a banner on the Dashboard offers it too); your own notes stay. **Delete all data** wipes everything after a confirmation, so export a backup first.
- The database is a single file: `data/stickpad.db`. Copy it to back up. Set `STICKPAD_DB=/path/file.db` to move it.
- Run on another port: `PORT=8080 python app.py`.

## 9. Keyboard shortcuts

| Keys | Action |
|---|---|
| `Ctrl/Cmd+K` | Search / jump |
| `Space` | Flip flashcard |
| `1`–`4` | Grade flashcard |
| `Tab` (in editor) | Indent |
| `Enter` (in calculators) | Calculate |

## 10. A sample study session

1. Open Dashboard, press **Study** (cards due badge) and clear your reviews (5 min).
2. Start a 25-min Pomodoro tagged with the course.
3. Take lecture notes with the *Lecture* template; mark facts `Q :: A`; press **Make cards**.
4. Put the numbers from a problem set into **Lab → Regression**; save the chart in **Graphs** and embed it in the note with `![[chart:ID]]`.
5. Cite the paper you used with `[@key]`; export the bibliography at the end.
