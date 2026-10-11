"""Demo content loaded by the 'Load demo data' button (English or Spanish)."""
import random
from datetime import date, timedelta


def load(raw_insert, lang="en"):
    insert = lambda kind, data: raw_insert(kind, {**data, "demo": True})
    es = lang == "es"
    L = lambda en, sp: sp if es else en
    today = date.today()
    d = lambda n: (today + timedelta(days=n)).isoformat()

    t_ttm = L("Time Value of Money", "Valor temporal del dinero")
    t_risk = L("Risk and Return", "Riesgo y rentabilidad")

    insert("note", dict(
        title=L("Welcome to StickPad", "Bienvenido a StickPad"), tags=[L("start", "inicio")], pinned=True, color="#fff3b0",
        body=L(f"""# Welcome

StickPad is a notebook for **studying, research and finance**. Everything is Markdown.

## Try these
- Link notes with wiki links: [[{t_ttm}]] (click it!)
- Math with KaTeX: $E = mc^2$ and display math:

$$FV = PV\\,(1+r)^n$$

- Make flashcards from a note: any line like `Term :: Definition` works.

Compounding :: Earning interest on previously earned interest
Rule of 72 :: Years to double ≈ 72 / rate(%)
The {{{{Sharpe ratio}}}} measures return per unit of risk.

- Tasks: `- [ ] read chapter 3` renders as a checklist.
- Switch language (EN / ES) at the bottom of the sidebar.
- Open the **Help** tab for the full tutorial.
""", f"""# Bienvenido

StickPad es un cuaderno para **estudiar, investigar y gestionar finanzas**. Todo es Markdown.

## Pruébalo
- Enlaza notas con enlaces wiki: [[{t_ttm}]] (¡haz clic!)
- Matemáticas con KaTeX: $E = mc^2$ y fórmulas en bloque:

$$VF = VA\\,(1+r)^n$$

- Crea tarjetas desde una nota: vale cualquier línea tipo `Término :: Definición`.

Capitalización :: Ganar intereses sobre los intereses ya ganados
Regla del 72 :: Años para duplicar ≈ 72 / tasa(%)
El {{{{ratio de Sharpe}}}} mide la rentabilidad por unidad de riesgo.

- Tareas: `- [ ] leer el capítulo 3` se muestra como lista de comprobación.
- Cambia de idioma (EN / ES) al final de la barra lateral.
- Abre la pestaña **Ayuda** para el tutorial completo.
""")))
    insert("note", dict(
        title=t_ttm, tags=[L("finance", "finanzas"), L("corporate-finance", "finanzas-corporativas")], color="#d4f1f4",
        body=L(f"""# Time Value of Money

A euro today is worth more than a euro tomorrow.

| Concept | Formula |
|---|---|
| Future value | $FV = PV(1+r)^n$ |
| Present value | $PV = \\dfrac{{FV}}{{(1+r)^n}}$ |
| Perpetuity | $PV = \\dfrac{{C}}{{r}}$ |
| NPV | $\\sum_{{t=0}}^{{T}} \\dfrac{{CF_t}}{{(1+r)^t}}$ |

Net present value :: Sum of discounted cash flows; accept projects with NPV > 0
IRR :: The discount rate that makes NPV equal zero

See also [[{t_risk}]] and the **Finance → Compound** calculator.

> Source: Brealey & Myers, *Principles of Corporate Finance*.
""", f"""# Valor temporal del dinero

Un euro hoy vale más que un euro mañana.

| Concepto | Fórmula |
|---|---|
| Valor futuro | $VF = VA(1+r)^n$ |
| Valor actual | $VA = \\dfrac{{VF}}{{(1+r)^n}}$ |
| Perpetuidad | $VA = \\dfrac{{C}}{{r}}$ |
| VAN | $\\sum_{{t=0}}^{{T}} \\dfrac{{FC_t}}{{(1+r)^t}}$ |

Valor actual neto :: Suma de flujos de caja descontados; se aceptan proyectos con VAN > 0
TIR :: La tasa de descuento que hace el VAN igual a cero

Mira también [[{t_risk}]] y la calculadora **Finanzas → Interés compuesto**.

> Fuente: Brealey & Myers, *Principles of Corporate Finance*.
""")))
    insert("note", dict(
        title=t_risk, tags=[L("finance", "finanzas"), L("portfolio", "cartera")], color="#ffd6e0",
        body=L(f"""# Risk and Return

Higher expected return usually requires accepting higher volatility.

- Volatility $\\sigma$ = standard deviation of returns
- Sharpe ratio $= \\dfrac{{R_p - R_f}}{{\\sigma_p}}$
- Diversification lowers risk when assets are not perfectly correlated.

CAPM :: Expected return = risk-free rate + beta × market risk premium
Beta :: Sensitivity of an asset's returns to market returns

Use **Finance → Monte Carlo** to see how volatility widens outcomes. Back to [[{t_ttm}]].

- [ ] Compute Sharpe for my ETF
- [x] Read CAPM chapter
""", f"""# Riesgo y rentabilidad

Una mayor rentabilidad esperada suele exigir aceptar más volatilidad.

- Volatilidad $\\sigma$ = desviación típica de los rendimientos
- Ratio de Sharpe $= \\dfrac{{R_p - R_f}}{{\\sigma_p}}$
- La diversificación reduce el riesgo cuando los activos no están perfectamente correlacionados.

CAPM :: Rentabilidad esperada = tasa libre de riesgo + beta × prima de riesgo de mercado
Beta :: Sensibilidad de los rendimientos de un activo a los del mercado

Usa **Finanzas → Monte Carlo** para ver cómo la volatilidad amplía los resultados. Volver a [[{t_ttm}]].

- [ ] Calcular el Sharpe de mi ETF
- [x] Leer el capítulo de CAPM
""")))
    insert("note", dict(
        title=L("Research log: inflation & savings", "Diario de investigación: inflación y ahorro"), tags=[L("research", "investigación")], color="#e2f0cb",
        body=L("""# Research question
How much purchasing power does cash lose over 20 years at 3% inflation?

## Method
Use the compound calculator with 0% rate and 3% inflation → real value column.

## Findings
- 100 → ~55 in real terms after 20 years.
- Cite: [@smith2020]

## Next
- [ ] Compare with index-fund real returns
""", """# Pregunta de investigación
¿Cuánto poder adquisitivo pierde el efectivo en 20 años con una inflación del 3%?

## Método
Usa la calculadora de interés compuesto con 0% de rentabilidad y 3% de inflación → columna de valor real.

## Resultados
- 100 → ~55 en términos reales tras 20 años.
- Cita: [@smith2020]

## Siguiente
- [ ] Comparar con la rentabilidad real de un fondo indexado
""")))

    cards = L([
        ("Compounding", "Earning interest on previously earned interest", "Finance"),
        ("Rule of 72", "Years to double ≈ 72 / rate(%)", "Finance"),
        ("CAPM", "E[R] = Rf + β(Rm − Rf)", "Finance"),
        ("What does NPV > 0 mean?", "The project creates value above the required return", "Finance"),
        ("Standard deviation measures…", "Dispersion of data around the mean", "Statistics"),
        ("What does R² represent?", "Share of variance in y explained by the model", "Statistics"),
        ("Type I error", "Rejecting a true null hypothesis (false positive)", "Statistics"),
    ], [
        ("Capitalización", "Ganar intereses sobre los intereses ya ganados", "Finanzas"),
        ("Regla del 72", "Años para duplicar ≈ 72 / tasa(%)", "Finanzas"),
        ("CAPM", "E[R] = Rf + β(Rm − Rf)", "Finanzas"),
        ("¿Qué significa VAN > 0?", "El proyecto crea valor por encima de la rentabilidad exigida", "Finanzas"),
        ("La desviación típica mide…", "La dispersión de los datos alrededor de la media", "Estadística"),
        ("¿Qué representa R²?", "La parte de la varianza de y explicada por el modelo", "Estadística"),
        ("Error de tipo I", "Rechazar una hipótesis nula verdadera (falso positivo)", "Estadística"),
    ])
    for q, a, dk in cards:
        insert("card", dict(front=q, back=a, deck=dk, ease=2.5, interval=0, reps=0, lapses=0, due=d(0)))

    insert("source", dict(type="article", authors="Smith, John; Doe, Jane", year="2020",
                          title=L("Inflation and household savings behaviour", "Inflación y comportamiento de ahorro de los hogares"),
                          container="Journal of Finance", volume="75(2)", pages="123-145", doi="10.1000/xyz123",
                          tags=[L("inflation", "inflación")],
                          notes=L("Key result: savers shift into real assets when inflation > 4%.",
                                  "Resultado clave: los ahorradores se pasan a activos reales cuando la inflación supera el 4%.")))
    insert("source", dict(type="book", authors="Brealey, Richard; Myers, Stewart", year="2019",
                          title="Principles of Corporate Finance", container="McGraw-Hill",
                          volume="", pages="", doi="", tags=[L("textbook", "manual")], notes=""))

    rnd = random.Random(1)
    income = L("Income", "Ingresos")
    salary = L("Salary", "Nómina")
    cats = [(L("Rent", "Alquiler"), -900), (L("Groceries", "Supermercado"), -60), (L("Transport", "Transporte"),
            -25), (L("Fun", "Ocio"), -40), (L("Study", "Estudios"), -30)]
    for m in range(5, -1, -1):
        base = today.replace(day=1) - timedelta(days=30 * m)
        insert("txn", dict(date=base.replace(day=1).isoformat(), description=salary, amount=2600, category=income))
        for _ in range(14):
            c, a = rnd.choice(cats)
            amt = -900 if a == -900 else round(a * rnd.uniform(0.5, 1.8), 2)
            day = rnd.randint(2, 27)
            if m == 0:
                day = min(day, max(1, today.day))
            insert("txn", dict(date=base.replace(day=day).isoformat(), description=c, amount=amt, category=c))

    insert("chart", dict(title=L("Quarterly revenue", "Ingresos trimestrales"), type="bar",
                         xlabel=L("Quarter", "Trimestre"), ylabel="M€",
                         data=L("Quarter,2023,2024", "Trimestre,2023,2024") + "\nQ1,12,15\nQ2,14,18\nQ3,13,21\nQ4,19,24"))
    insert("chart", dict(title=L("Function: damped wave", "Función: onda amortiguada"), type="function",
                         expr="exp(-x/6)*sin(x)", xmin=0, xmax=30, data=""))
    insert("task", dict(text=L("Finish statistics problem set", "Terminar la hoja de problemas de estadística"),
                        due=d(2), done=False, priority="high", subject=L("Statistics", "Estadística")))
    insert("task", dict(text=L("Read CAPM chapter", "Leer el capítulo de CAPM"), due=d(-1), done=False,
                        priority="med", subject=L("Finance", "Finanzas")))
    insert("task", dict(text=L("Outline term paper", "Esbozar el trabajo del curso"), due=d(7), done=False,
                        priority="low", subject=L("Research", "Investigación")))
    insert("holding", dict(symbol="AAPL", shares=5, cost=150))
    insert("holding", dict(symbol="MSFT", shares=3, cost=300))
    for i in range(1, 12):
        insert("log", dict(date=d(-i), type="review", amount=rnd.randint(0, 12)))
