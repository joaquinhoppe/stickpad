"""StickPad - notes, graphs, finance & study workbench. Flask backend."""
import csv
import io
import json
import math
import os
import random
import re
import sqlite3
import time
import statistics
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

from flask import Flask, jsonify, request, send_from_directory, Response

BASE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("STICKPAD_DB", os.path.join(BASE, "data", "stickpad.db"))
KINDS = {"note", "chart", "card", "source", "txn", "task", "session", "holding",
         "log", "budget", "goal", "deck", "scenario", "subject", "mark"}

try:
    VERSION = open(os.path.join(BASE, "VERSION")).read().strip()
except OSError:
    VERSION = "dev"
PRESENCE = {"last_ping": 0.0, "bye": 0.0}  # lets the desktop launcher notice when its window was closed

app = Flask(__name__, static_folder="static", static_url_path="/static")


# ----------------------------------------------------------------- storage
def db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS docs(
        id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL,
        data TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL)""")
    c.execute("CREATE INDEX IF NOT EXISTS ix_kind ON docs(kind)")
    c.execute("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    return c


def get_setting(key, default=""):
    with db() as c:
        r = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return r["value"] if r else default


def set_setting(key, value):
    with db() as c:
        if value:
            c.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, value))
        else:
            c.execute("DELETE FROM settings WHERE key=?", (key,))


def now():
    return datetime.now().isoformat(timespec="seconds")


def row_to_doc(r):
    d = json.loads(r["data"])
    d.update(id=r["id"], kind=r["kind"], created=r["created"], updated=r["updated"])
    return d


def clean(body):
    return {k: v for k, v in (body or {}).items() if k not in ("id", "kind", "created", "updated")}


def insert(kind, data):
    with db() as c:
        t = now()
        cur = c.execute("INSERT INTO docs(kind,data,created,updated) VALUES(?,?,?,?)",
                        (kind, json.dumps(data), t, t))
        r = c.execute("SELECT * FROM docs WHERE id=?", (cur.lastrowid,)).fetchone()
    return row_to_doc(r)


def all_of(kind):
    with db() as c:
        return [row_to_doc(r) for r in c.execute(
            "SELECT * FROM docs WHERE kind=? ORDER BY id", (kind,))]


def get_doc(i):
    with db() as c:
        r = c.execute("SELECT * FROM docs WHERE id=?", (i,)).fetchone()
    return row_to_doc(r) if r else None


def save_doc(i, data):
    with db() as c:
        c.execute("UPDATE docs SET data=?, updated=? WHERE id=?", (json.dumps(data), now(), i))


def log(kind, amount=1, **extra):
    insert("log", dict(date=date.today().isoformat(), type=kind, amount=amount, **extra))


# --------------------------------------------------------------- generic CRUD
@app.route("/")
def index():
    return send_from_directory(os.path.join(BASE, "static"), "index.html")


@app.get("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(BASE, "static"), "icon.png", mimetype="image/png")


@app.get("/api/ping")
def ping():
    PRESENCE["last_ping"] = time.time()
    PRESENCE["bye"] = 0.0
    return jsonify(app="stickpad", version=VERSION)


@app.post("/api/bye")
def bye():
    PRESENCE["bye"] = time.time()
    return "", 204


@app.get("/changelog.md")
def changelog():
    return send_from_directory(BASE, "CHANGELOG.md", mimetype="text/markdown")


@app.get("/tutorial.md")
def tutorial():
    name = "TUTORIAL.es.md" if request.args.get("lang") == "es" else "TUTORIAL.md"
    return send_from_directory(BASE, name, mimetype="text/markdown")


@app.get("/api/<kind>")
def list_docs(kind):
    if kind not in KINDS:
        return jsonify(error="unknown kind"), 404
    return jsonify(all_of(kind))


@app.post("/api/<kind>")
def create_doc(kind):
    if kind not in KINDS:
        return jsonify(error="unknown kind"), 404
    data = clean(request.get_json(silent=True))
    if kind == "card":
        data.setdefault("ease", 2.5)
        data.setdefault("interval", 0)
        data.setdefault("reps", 0)
        data.setdefault("lapses", 0)
        data.setdefault("due", date.today().isoformat())
    d = insert(kind, data)
    if kind == "note":
        log("note", 1)
    return jsonify(d), 201


@app.get("/api/<kind>/<int:i>")
def read_doc(kind, i):
    d = get_doc(i)
    if not d or d["kind"] != kind:
        return jsonify(error="not found"), 404
    return jsonify(d)


@app.put("/api/<kind>/<int:i>")
def update_doc(kind, i):
    d = get_doc(i)
    if not d or d["kind"] != kind:
        return jsonify(error="not found"), 404
    for k in ("id", "kind", "created", "updated"):
        d.pop(k)
    new = clean(request.get_json(silent=True))
    content = ("title", "body", "text", "front", "back", "description", "name")
    if d.get("demo") and any(k in new and new[k] != d.get(k) for k in content):
        d.pop("demo")  # the user rewrote it, so it is now theirs
    d.update(new)
    save_doc(i, d)
    return jsonify(get_doc(i))


@app.delete("/api/<kind>/<int:i>")
def delete_doc(kind, i):
    with db() as c:
        c.execute("DELETE FROM docs WHERE id=? AND kind=?", (i, kind))
    return jsonify(ok=True)


# ------------------------------------------------------------------- search
@app.get("/api/search")
def search():
    q = request.args.get("q", "").strip().lower()
    if not q:
        return jsonify([])
    out = []
    for kind in ("note", "card", "source", "task", "chart"):
        for d in all_of(kind):
            blob = json.dumps(d, ensure_ascii=False).lower()
            if q in blob:
                title = d.get("title") or d.get("front") or d.get("name") or d.get("text") or f"#{d['id']}"
                pos = blob.find(q)
                out.append(dict(kind=kind, id=d["id"], title=title,
                                snippet=blob[max(0, pos - 40):pos + 80]))
    return jsonify(out[:60])


# ------------------------------------------------------- spaced repetition
@app.get("/api/cards/due")
def cards_due():
    today = date.today().isoformat()
    deck = request.args.get("deck")
    cs = [c for c in all_of("card") if c.get("due", today) <= today
          and (not deck or c.get("deck") == deck)]
    random.shuffle(cs)
    return jsonify(cs)


def sm2(card, grade):
    """SM-2: grade 0-5. Returns updated scheduling fields."""
    ease, reps, interval = card.get("ease", 2.5), card.get("reps", 0), card.get("interval", 0)
    lapses = card.get("lapses", 0)
    if grade < 3:
        reps, interval, lapses = 0, 1, lapses + 1
    else:
        reps += 1
        interval = 1 if reps == 1 else 6 if reps == 2 else round(interval * ease)
        if grade == 3:
            interval = max(1, round(interval * 0.8))
        if grade == 5:
            interval = round(interval * 1.3)
    ease = max(1.3, ease + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    due = (date.today() + timedelta(days=interval)).isoformat()
    return dict(ease=round(ease, 3), reps=reps, interval=interval, due=due, lapses=lapses)


@app.post("/api/cards/<int:i>/review")
def review_card(i):
    c = get_doc(i)
    if not c or c["kind"] != "card":
        return jsonify(error="not found"), 404
    grade = int(request.get_json(silent=True).get("grade", 4))
    for k in ("id", "kind", "created", "updated"):
        c.pop(k)
    c.update(sm2(c, grade))
    c["last_review"] = date.today().isoformat()
    save_doc(i, c)
    log("review", 1)
    return jsonify(get_doc(i))


CARD_RE = re.compile(r"^\s*(?:[-*]\s*)?(.+?)\s*::\s*(.+?)\s*$")
CLOZE_RE = re.compile(r"\{\{(.+?)\}\}")


@app.post("/api/cards/from-note/<int:i>")
def cards_from_note(i):
    """Turn 'Question :: Answer' lines and {{cloze}} sentences into flashcards."""
    n = get_doc(i)
    if not n or n["kind"] != "note":
        return jsonify(error="not found"), 404
    deck = request.get_json(silent=True, force=True) or {}
    deck = deck.get("deck") or n.get("title") or "Notes"
    existing = {(c["front"], c["back"]) for c in all_of("card")}
    made = []
    for line in n.get("body", "").splitlines():
        front = back = None
        if "`" in line:
            continue
        if CLOZE_RE.search(line):
            front = CLOZE_RE.sub("[...]", line).strip(" -*")
            back = CLOZE_RE.sub(r"\1", line).strip(" -*")
        else:
            m = CARD_RE.match(line)
            if m:
                front, back = m.group(1), m.group(2)
        if front and (front, back) not in existing:
            existing.add((front, back))
            made.append(insert("card", dict(front=front, back=back, deck=deck, ease=2.5,
                                            interval=0, reps=0, lapses=0,
                                            due=date.today().isoformat(), note=i)))
    return jsonify(made)


# ------------------------------------------------------------------ finance
def f(v, d=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


@app.post("/api/finance/compound")
def compound():
    b = request.get_json(silent=True)
    p, pmt, rate, yrs = f(b.get("principal")), f(b.get("monthly")), f(b.get("rate")) / 100, int(f(b.get("years"), 10))
    infl, n = f(b.get("inflation")) / 100, int(f(b.get("freq"), 12))
    bal, contrib, rows = p, p, []
    for y in range(1, yrs + 1):
        for _ in range(n):
            bal = bal * (1 + rate / n) + pmt * 12 / n
        contrib += pmt * 12
        rows.append(dict(year=y, balance=round(bal, 2), contributed=round(contrib, 2),
                         interest=round(bal - contrib, 2),
                         real=round(bal / (1 + infl) ** y, 2)))
    return jsonify(rows=rows)


@app.post("/api/finance/loan")
def loan():
    b = request.get_json(silent=True)
    P, r, years, extra = f(b.get("amount")), f(b.get("rate")) / 100 / 12, f(b.get("years"), 30), f(b.get("extra"))
    n = int(years * 12)
    pay = P / n if r == 0 else P * r / (1 - (1 + r) ** -n)
    bal, rows, tot_int = P, [], 0
    for m in range(1, n + 1):
        interest = bal * r
        princ = min(bal, pay + extra - interest)
        bal -= princ
        tot_int += interest
        rows.append(dict(month=m, payment=round(princ + interest, 2), principal=round(princ, 2),
                         interest=round(interest, 2), balance=round(max(bal, 0), 2)))
        if bal <= 0.005:
            break
    return jsonify(payment=round(pay, 2), total_interest=round(tot_int, 2),
                   months=len(rows), total_paid=round(P + tot_int, 2), rows=rows)


def npv(rate, flows):
    return sum(cf / (1 + rate) ** t for t, cf in enumerate(flows))


def irr(flows):
    lo, hi = -0.99, 10.0
    if npv(lo, flows) * npv(hi, flows) > 0:
        return None
    for _ in range(200):
        mid = (lo + hi) / 2
        if npv(lo, flows) * npv(mid, flows) <= 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


@app.post("/api/finance/npv")
def npv_irr():
    b = request.get_json(silent=True)
    flows = [f(x) for x in b.get("flows", [])]
    rate = f(b.get("rate"), 8) / 100
    pb, cum = None, 0
    for t, cf in enumerate(flows):
        prev = cum
        cum += cf
        if pb is None and cum >= 0 and t > 0:
            pb = t - 1 + (-prev / cf if cf else 0)
    r = irr(flows)
    return jsonify(npv=round(npv(rate, flows), 2), irr=None if r is None else round(r * 100, 3),
                   payback=None if pb is None else round(pb, 2))


def ncdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


@app.post("/api/finance/blackscholes")
def black_scholes():
    b = request.get_json(silent=True)
    S, K, T, r, s = f(b.get("S")), f(b.get("K")), f(b.get("T"), 1), f(b.get("r")) / 100, f(b.get("sigma")) / 100
    q = f(b.get("q")) / 100
    if min(S, K, T, s) <= 0:
        return jsonify(error="S, K, T and sigma must be positive"), 400
    d1 = (math.log(S / K) + (r - q + s * s / 2) * T) / (s * math.sqrt(T))
    d2 = d1 - s * math.sqrt(T)
    call = S * math.exp(-q * T) * ncdf(d1) - K * math.exp(-r * T) * ncdf(d2)
    put = K * math.exp(-r * T) * ncdf(-d2) - S * math.exp(-q * T) * ncdf(-d1)
    pdf = math.exp(-d1 * d1 / 2) / math.sqrt(2 * math.pi)
    payoff = []
    for k in range(21):
        st = S * (0.6 + 0.04 * k * 2)
        payoff.append(dict(S=round(st, 2), call=round(max(st - K, 0) - call, 2),
                           put=round(max(K - st, 0) - put, 2)))
    return jsonify(call=round(call, 4), put=round(put, 4),
                   delta_call=round(math.exp(-q * T) * ncdf(d1), 4),
                   delta_put=round(math.exp(-q * T) * (ncdf(d1) - 1), 4),
                   gamma=round(math.exp(-q * T) * pdf / (S * s * math.sqrt(T)), 6),
                   vega=round(S * math.exp(-q * T) * pdf * math.sqrt(T) / 100, 4),
                   theta_call=round((-S * pdf * s * math.exp(-q * T) / (2 * math.sqrt(T))
                                     - r * K * math.exp(-r * T) * ncdf(d2)) / 365, 4),
                   payoff=payoff)


@app.post("/api/finance/montecarlo")
def montecarlo():
    """Simulate portfolio growth with geometric Brownian motion."""
    b = request.get_json(silent=True)
    p0, add, yrs = f(b.get("principal")), f(b.get("monthly")) * 12, int(f(b.get("years"), 20))
    mu, sig, n = f(b.get("mean"), 7) / 100, f(b.get("vol"), 15) / 100, min(int(f(b.get("paths"), 1000)), 5000)
    target = f(b.get("target"))
    rnd = random.Random(b.get("seed", 42))
    finals, by_year = [], [[] for _ in range(yrs + 1)]
    for _ in range(n):
        v = p0
        by_year[0].append(v)
        for y in range(1, yrs + 1):
            z = rnd.gauss(0, 1)
            v = max(0.0, (v + add / 2) * math.exp(mu - sig * sig / 2 + sig * z) + add / 2)
            by_year[y].append(v)
        finals.append(v)

    def pct(arr, p):
        s = sorted(arr)
        return s[min(len(s) - 1, int(p / 100 * len(s)))]

    bands = [dict(year=y, p10=round(pct(a, 10)), p25=round(pct(a, 25)), p50=round(pct(a, 50)),
                  p75=round(pct(a, 75)), p90=round(pct(a, 90))) for y, a in enumerate(by_year)]
    return jsonify(bands=bands, median=round(pct(finals, 50)),
                   prob_target=round(sum(1 for x in finals if x >= target) / n * 100, 1) if target else None,
                   worst=round(min(finals)), best=round(max(finals)))


@app.post("/api/finance/fire")
def fire():
    """Years until financial independence (25x expenses / safe-withdrawal rule)."""
    b = request.get_json(silent=True)
    bal, save, ret = f(b.get("savings")), f(b.get("annual_saving")), f(b.get("rate"), 6) / 100
    spend, swr = f(b.get("annual_spend")), f(b.get("swr"), 4) / 100
    target = spend / swr if swr else 0
    rows, yrs = [], 0
    while bal < target and yrs < 100:
        bal = bal * (1 + ret) + save
        yrs += 1
        rows.append(dict(year=yrs, balance=round(bal), target=round(target)))
    return jsonify(target=round(target), years=yrs if yrs < 100 else None, rows=rows)


@app.get("/api/finance/summary")
def finance_summary():
    tx = all_of("txn")
    months, cats = {}, {}
    for t in tx:
        amt = f(t.get("amount"))
        m = (t.get("date") or "")[:7]
        e = months.setdefault(m, dict(month=m, income=0, expense=0))
        if amt >= 0:
            e["income"] += amt
        else:
            e["expense"] += -amt
            cats[t.get("category", "other")] = cats.get(t.get("category", "other"), 0) - amt
    ms = sorted(months.values(), key=lambda x: x["month"])
    return jsonify(months=ms, categories=[dict(name=k, total=round(v, 2)) for k, v in
                                          sorted(cats.items(), key=lambda kv: -kv[1])],
                   balance=round(sum(f(t.get("amount")) for t in tx), 2))


@app.post("/api/finance/import-csv")
def import_csv():
    """CSV with columns date, description, amount[, category]."""
    text = request.get_data(as_text=True)
    made = 0
    for row in csv.DictReader(io.StringIO(text)):
        row = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
        if "date" in row and "amount" in row:
            insert("txn", dict(date=row["date"], description=row.get("description", ""),
                               amount=f(row["amount"].replace(",", "")),
                               category=row.get("category") or "other"))
            made += 1
    return jsonify(imported=made)


# ---- market data: the user supplies their own API key (stored only in the local database)
PROVIDERS = {
    "finnhub": dict(name="Finnhub", url="https://finnhub.io/register", history=False),
    "alphavantage": dict(name="Alpha Vantage", url="https://www.alphavantage.co/support/#api-key", history=True),
    "twelvedata": dict(name="Twelve Data", url="https://twelvedata.com/register", history=True),
}


def http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "StickPad/1.0", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read().decode())
            msg = msg.get("error") or msg.get("message") or str(msg)
        except Exception:
            msg = ""
        raise ValueError(f"HTTP {e.code} {msg}".strip())
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise ValueError("no connection to the data provider (" + str(getattr(e, "reason", e))[:60] + ")")


def _check_av(d):
    for k in ("Error Message", "Note", "Information"):
        if k in d:
            raise ValueError(str(d[k])[:140])


def fetch_quote(provider, key, sym):
    q = urllib.parse.quote(sym)
    if provider == "finnhub":
        d = http_json(f"https://finnhub.io/api/v1/quote?symbol={q}&token={urllib.parse.quote(key)}")
        if not d.get("c"):
            raise ValueError("unknown symbol")
        return dict(price=f(d["c"]), open=f(d.get("o")), date=datetime.fromtimestamp(d["t"]).date().isoformat() if d.get("t") else "")
    if provider == "alphavantage":
        d = http_json(f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={q}&apikey={urllib.parse.quote(key)}")
        _check_av(d)
        g = d.get("Global Quote") or {}
        if not g.get("05. price"):
            raise ValueError("unknown symbol")
        return dict(price=f(g["05. price"]), open=f(g.get("02. open")), date=g.get("07. latest trading day", ""))
    if provider == "twelvedata":
        d = http_json(f"https://api.twelvedata.com/quote?symbol={q}&apikey={urllib.parse.quote(key)}")
        if d.get("status") == "error":
            raise ValueError(str(d.get("message", "error"))[:140])
        if not d.get("close"):
            raise ValueError("unknown symbol")
        return dict(price=f(d["close"]), open=f(d.get("open")), date=(d.get("datetime") or "")[:10])
    raise ValueError("unknown provider")


def fetch_history(provider, key, sym, days):
    q, k = urllib.parse.quote(sym), urllib.parse.quote(key)
    if provider == "alphavantage":
        d = http_json(f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={q}&outputsize=compact&apikey={k}")
        _check_av(d)
        ts = d.get("Time Series (Daily)") or {}
        rows = [dict(date=dt, close=f(v.get("4. close"))) for dt, v in sorted(ts.items())]
    elif provider == "twelvedata":
        d = http_json(f"https://api.twelvedata.com/time_series?symbol={q}&interval=1day&outputsize={min(days, 500)}&apikey={k}")
        if d.get("status") == "error":
            raise ValueError(str(d.get("message", "error"))[:140])
        rows = [dict(date=v["datetime"][:10], close=f(v.get("close"))) for v in reversed(d.get("values") or [])]
    else:
        raise ValueError("this provider's free plan has no price history; choose Alpha Vantage or Twelve Data")
    if not rows:
        raise ValueError("no history for this symbol")
    return rows[-days:]


def mask(key):
    return ("\u2022" * 6 + key[-4:]) if key else ""


@app.get("/api/settings")
def settings_get():
    prov, key = get_setting("provider"), get_setting("api_key")
    return jsonify(provider=prov, has_key=bool(key), key_hint=mask(key),
                   providers={k: dict(name=v["name"], url=v["url"], history=v["history"]) for k, v in PROVIDERS.items()})


@app.put("/api/settings")
def settings_put():
    b = request.get_json(silent=True) or {}
    prov = b.get("provider", get_setting("provider"))
    if prov and prov not in PROVIDERS:
        return jsonify(error="unknown provider"), 400
    set_setting("provider", prov)
    if b.get("clear"):
        set_setting("api_key", "")
    elif b.get("key"):
        set_setting("api_key", str(b["key"]).strip())
    return settings_get()


@app.post("/api/settings/test")
def settings_test():
    """Check a provider/key pair (the typed one, or the saved key if none is typed) with a real quote."""
    b = request.get_json(silent=True) or {}
    prov = b.get("provider") or get_setting("provider")
    key = (b.get("key") or "").strip() or get_setting("api_key")
    if prov not in PROVIDERS or not key:
        return jsonify(ok=False, error="choose a provider and enter a key"), 400
    try:
        r = fetch_quote(prov, key, "AAPL")
        return jsonify(ok=True, sample=r)
    except ValueError as e:
        return jsonify(ok=False, error=str(e)), 200


@app.get("/api/quote")
def quote():
    prov, key = get_setting("provider"), get_setting("api_key")
    if not (prov and key):
        return jsonify(error="no_key"), 400
    out = {}
    for sym in [x for x in request.args.get("symbols", "").split(",") if x][:20]:
        try:
            out[sym.upper()] = fetch_quote(prov, key, sym)
        except ValueError as e:
            out[sym.upper()] = dict(error=str(e))
    return jsonify(out)


@app.get("/api/history")
def history():
    prov, key = get_setting("provider"), get_setting("api_key")
    if not (prov and key):
        return jsonify(error="no_key"), 400
    try:
        return jsonify(fetch_history(prov, key, request.args.get("symbol", "AAPL"), int(request.args.get("days", 250))))
    except ValueError as e:
        return jsonify(error=str(e)), 502


# -------------------------------------------------------------------- stats
def nums(b, key="values"):
    v = b.get(key, [])
    if isinstance(v, str):
        v = re.split(r"[\s,;]+", v.strip())
    return [float(x) for x in v if str(x).strip() not in ("",)]


@app.post("/api/stats/describe")
def describe():
    xs = nums(request.get_json(silent=True))
    n = len(xs)
    if n < 2:
        return jsonify(error="need at least 2 numbers"), 400
    xs_s = sorted(xs)
    m, sd = statistics.mean(xs), statistics.stdev(xs)
    q = statistics.quantiles(xs, n=4) if n >= 2 else [0, 0, 0]
    skew = sum(((x - m) / sd) ** 3 for x in xs) * n / ((n - 1) * (n - 2)) if n > 2 and sd else 0
    bins = min(12, max(4, int(math.sqrt(n))))
    lo, hi = xs_s[0], xs_s[-1]
    w = (hi - lo) / bins or 1
    hist = [0] * bins
    for x in xs:
        hist[min(bins - 1, int((x - lo) / w))] += 1
    mode = None
    try:
        mode = statistics.mode(xs)
    except statistics.StatisticsError:
        pass
    return jsonify(n=n, mean=m, median=statistics.median(xs), mode=mode, stdev=sd,
                   variance=statistics.variance(xs), min=lo, max=hi, range=hi - lo,
                   q1=q[0], q3=q[2], iqr=q[2] - q[0], skew=skew, sem=sd / math.sqrt(n),
                   ci95=[m - 1.96 * sd / math.sqrt(n), m + 1.96 * sd / math.sqrt(n)],
                   sum=sum(xs), hist=dict(labels=[round(lo + i * w, 3) for i in range(bins)], counts=hist))


@app.post("/api/stats/regression")
def regression():
    b = request.get_json(silent=True)
    xs, ys = nums(b, "x"), nums(b, "y")
    if len(xs) != len(ys) or len(xs) < 3:
        return jsonify(error="x and y need the same length (>= 3)"), 400
    n = len(xs)
    mx, my = statistics.mean(xs), statistics.mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    if sxx == 0:
        return jsonify(error="x has no variance"), 400
    slope = sxy / sxx
    icpt = my - slope * mx
    r = sxy / math.sqrt(sxx * syy) if syy else 0
    sse = sum((y - (icpt + slope * x)) ** 2 for x, y in zip(xs, ys))
    se = math.sqrt(sse / (n - 2)) if n > 2 else 0
    return jsonify(slope=slope, intercept=icpt, r=r, r2=r * r, n=n, std_error=se,
                   slope_se=se / math.sqrt(sxx),
                   t_stat=(slope / (se / math.sqrt(sxx))) if se else None,
                   forecast=[dict(x=x, y=icpt + slope * x) for x in (min(xs), max(xs))])



# ------------------------------------------------- subjects, marks & balance
@app.get("/api/subjects/analysis")
def subjects_analysis():
    """Per-subject average, trend and study-time balance.

    Recommended attention is proportional to how far a subject is below its
    target plus how fast it is falling; it is compared with the share of focus
    minutes (last 30 days) the subject actually received.
    """
    subs, marks, sessions = all_of("subject"), all_of("mark"), all_of("session")
    today_d = date.today()
    since = (today_d - timedelta(days=30)).isoformat()
    rows = []
    for sb in subs:
        ms = sorted((m for m in marks if m.get("subject") == sb["id"]), key=lambda m: m.get("date", ""))
        pts = []
        for m in ms:
            mx = f(m.get("max"), 100) or 100
            pts.append((m.get("date", ""), f(m.get("score")) / mx * 100, f(m.get("weight"), 1) or 1))
        avg = sum(p[1] * p[2] for p in pts) / sum(p[2] for p in pts) if pts else None
        slope = None  # percentage points per 30 days
        if len(pts) >= 2:
            xs = [datetime.fromisoformat(p[0]).toordinal() if p[0] else 0 for p in pts]
            ys = [p[1] for p in pts]
            mx_, my_ = sum(xs) / len(xs), sum(ys) / len(ys)
            sxx = sum((x - mx_) ** 2 for x in xs)
            if sxx:
                slope = sum((x - mx_) * (y - my_) for x, y in zip(xs, ys)) / sxx * 30
        name = (sb.get("name") or "").strip().lower()
        mine = [x for x in sessions if (x.get("subject") or "").strip().lower() == name]
        mins30 = sum(f(x.get("minutes")) for x in mine if x.get("date", "") >= since)
        target = f(sb.get("target"), 70)
        gap = max(0.0, target - avg) if avg is not None else 10.0
        decline = max(0.0, -slope) if slope is not None else 0.0
        rows.append(dict(id=sb["id"], name=sb.get("name"), color=sb.get("color"), target=target,
                         avg=None if avg is None else round(avg, 1), n=len(pts),
                         last=None if not pts else round(pts[-1][1], 1),
                         slope=None if slope is None else round(slope, 1),
                         minutes=round(mins30), need=gap + decline + 5))
    total_min = sum(r["minutes"] for r in rows)
    total_need = sum(r["need"] for r in rows) or 1
    for r in rows:
        r["recommended"] = round(r.pop("need") / total_need * 100, 1)
        r["actual"] = round(r["minutes"] / total_min * 100, 1) if total_min else 0.0
        below = r["avg"] is not None and r["avg"] < r["target"]
        falling = r["slope"] is not None and r["slope"] < -2
        if not total_min:
            r["status"] = "no_time"
        elif r["actual"] < r["recommended"] * 0.6 and (below or falling or r["avg"] is None):
            r["status"] = "neglected"
        elif r["actual"] > r["recommended"] * 1.6 and r["avg"] is not None and r["avg"] >= r["target"]:
            r["status"] = "over"
        else:
            r["status"] = "ok"
    # weekly minutes per subject, last 8 weeks (Monday-based)
    monday = today_d - timedelta(days=today_d.weekday())
    weeks = [(monday - timedelta(weeks=i)) for i in range(7, -1, -1)]
    weekly = []
    for w in weeks:
        end = w + timedelta(days=7)
        entry = {"week": w.isoformat()}
        for sb in subs:
            name = (sb.get("name") or "").strip().lower()
            entry[str(sb["id"])] = round(sum(f(x.get("minutes")) for x in sessions
                                              if (x.get("subject") or "").strip().lower() == name
                                              and w.isoformat() <= x.get("date", "") < end.isoformat()))
        weekly.append(entry)
    allpts = [(f(m.get("score")) / (f(m.get("max"), 100) or 100) * 100, f(m.get("weight"), 1) or 1) for m in marks]
    overall = sum(a * w for a, w in allpts) / sum(w for _, w in allpts) if allpts else None
    return jsonify(subjects=rows, weekly=weekly, total_minutes=round(total_min),
                   overall=None if overall is None else round(overall, 1))


# ---------------------------------------------------------------- dashboard
@app.get("/api/dashboard")
def dashboard():
    logs = all_of("log")
    sessions = all_of("session")
    by_day = {}
    for l in logs:
        if l.get("date"):
            by_day[l["date"]] = by_day.get(l["date"], 0) + f(l.get("amount"), 1)
    for s in sessions:
        by_day[s["date"]] = by_day.get(s["date"], 0) + f(s.get("minutes")) / 5
    streak, d = 0, date.today()
    if d.isoformat() not in by_day:
        d -= timedelta(days=1)
    while d.isoformat() in by_day:
        streak += 1
        d -= timedelta(days=1)
    today = date.today().isoformat()
    cards = all_of("card")
    week = (date.today() - timedelta(days=6)).isoformat()
    tasks = all_of("task")
    return jsonify(
        notes=len(all_of("note")), cards=len(cards),
        due=sum(1 for c in cards if c.get("due", today) <= today),
        mature=sum(1 for c in cards if c.get("interval", 0) >= 21),
        open_tasks=sum(1 for t in tasks if not t.get("done")),
        overdue=sum(1 for t in tasks if not t.get("done") and t.get("due") and t["due"] < today),
        sources=len(all_of("source")), charts=len(all_of("chart")),
        streak=streak, activity=by_day,
        minutes_week=sum(f(s.get("minutes")) for s in sessions if s["date"] >= week),
        minutes_total=sum(f(s.get("minutes")) for s in sessions),
        reviews_today=sum(1 for l in logs if l.get("date") == today and l.get("type") == "review"),
        balance=round(sum(f(t.get("amount")) for t in all_of("txn")), 2))


# ----------------------------------------------------------------- citations
def split_authors(s):
    return [a.strip() for a in re.split(r";|\band\b", s or "") if a.strip()]


def last_first(a):
    if "," in a:
        l, fi = [x.strip() for x in a.split(",", 1)]
    else:
        parts = a.split()
        l, fi = parts[-1], " ".join(parts[:-1])
    return l, fi


def cite(s, style):
    au = split_authors(s.get("authors"))
    year, title, cont = s.get("year", "n.d."), s.get("title", ""), s.get("container", "")
    vol, pages, doi, url = s.get("volume", ""), s.get("pages", ""), s.get("doi", ""), s.get("url", "")
    link = f"https://doi.org/{doi}" if doi else url
    if style == "bibtex":
        key = (last_first(au[0])[0] if au else "anon").lower() + str(year)
        key = re.sub(r"\W", "", key)
        et = {"book": "book", "web": "misc"}.get(s.get("type"), "article")
        fields = [("author", " and ".join(au)), ("title", title), ("journal" if et == "article" else "publisher", cont),
                  ("year", year), ("volume", vol), ("pages", pages), ("doi", doi), ("url", url)]
        return f"@{et}{{{key},\n" + ",\n".join(f"  {k} = {{{v}}}" for k, v in fields if v) + "\n}"
    if style == "mla":
        names = [", ".join(last_first(au[0]))] + [" ".join(reversed(last_first(a))) for a in au[1:]] if au else []
        a = (names[0] + " et al" if len(names) > 2 else " and ".join(names)) if names else ""
        return f'{a}. "{title}." {cont}{", vol. " + vol if vol else ""}, {year}{", pp. " + pages if pages else ""}. {link}'.strip()
    if style == "chicago":
        a = ", ".join(", ".join(last_first(x)) if i == 0 else " ".join(reversed(last_first(x)))
                      for i, x in enumerate(au))
        return f'{a}. {year}. "{title}." {cont}{" " + vol if vol else ""}{": " + pages if pages else ""}. {link}'.strip()
    # APA 7
    def ini(a):
        l, fi = last_first(a)
        return f"{l}, " + " ".join(p[0] + "." for p in fi.replace("-", " ").split() if p)
    a = ", & ".join([", ".join(ini(x) for x in au[:-1]), ini(au[-1])]) if len(au) > 1 else (ini(au[0]) if au else "")
    return f"{a} ({year}). {title}. {cont}{', ' + vol if vol else ''}{', ' + pages if pages else ''}. {link}".replace(" .", ".").strip()


@app.get("/api/cite")
def cite_all():
    style = request.args.get("style", "apa")
    ids = request.args.get("ids")
    srcs = all_of("source")
    if ids:
        want = {int(x) for x in ids.split(",") if x}
        srcs = [s for s in srcs if s["id"] in want]
    srcs.sort(key=lambda s: (s.get("authors") or s.get("title") or "").lower())
    return jsonify([dict(id=s["id"], text=cite(s, style)) for s in srcs])


# ------------------------------------------------------------- export/import
@app.get("/api/export")
def export_all():
    out = {k: all_of(k) for k in sorted(KINDS)}
    return Response(json.dumps(out, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": f"attachment; filename=stickpad-{date.today()}.json"})


@app.post("/api/import")
def import_all():
    data = request.get_json(silent=True) or {}
    n = 0
    for kind, items in data.items():
        if kind in KINDS and isinstance(items, list):
            for d in items:
                insert(kind, clean(d))
                n += 1
    return jsonify(imported=n)


def legacy_demo_signatures():
    """Demo items loaded before they were flagged: recognise them by their seed content."""
    from seed import load
    sig = set()
    key = {"note": "title", "card": "front", "source": "title", "task": "text", "chart": "title", "holding": "symbol"}

    def rec(kind, data):
        if kind in key:
            sig.add((kind, data[key[kind]]))

    for lang in ("en", "es"):
        load(rec, lang)
    return sig, key


@app.delete("/api/demo")
def delete_demo():
    """Remove only the items loaded by 'Load demo data'."""
    with db() as c:
        rows = [(r["id"], r["kind"], json.loads(r["data"])) for r in c.execute("SELECT id, kind, data FROM docs")]
        ids = [i for i, _, d in rows if d.get("demo")]
        if not ids:  # data seeded by an older version carries no flag
            sig, key = legacy_demo_signatures()
            for i, kind, d in rows:
                if kind in key and (kind, d.get(key[kind])) in sig:
                    ids.append(i)
                elif kind == "txn" and (d.get("description") == d.get("category") or
                                        (d.get("description") in ("Salary", "Nómina") and d.get("amount") == 2600)):
                    ids.append(i)
        c.executemany("DELETE FROM docs WHERE id=?", [(i,) for i in ids])
    return jsonify(deleted=len(ids))


@app.delete("/api/all")
def delete_all():
    if request.args.get("confirm") != "yes":
        return jsonify(error="confirmation required"), 400
    with db() as c:
        n = c.execute("DELETE FROM docs").rowcount
    return jsonify(deleted=n)


@app.post("/api/seed")
def seed():
    """Load demo content so a new user can explore (only if the notebook is empty)."""
    if all_of("note"):
        return jsonify(seeded=False)
    from seed import load
    lang = (request.get_json(silent=True) or {}).get("lang", "en")
    load(insert, lang)
    return jsonify(seeded=True)


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
