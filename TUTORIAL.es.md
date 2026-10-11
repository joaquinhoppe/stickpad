# Tutorial de StickPad

StickPad es un banco de trabajo personal para **estudiar, investigar y gestionar finanzas**. Funciona en local (Flask + Vue), guarda todo en un único archivo SQLite (`data/stickpad.db`) y funciona sin conexión (salvo los precios de bolsa en vivo).

> **Empieza rápido:** ve a **Panel → Cargar datos de ejemplo**. Tendrás notas, tarjetas, movimientos, gráficos y fuentes para trastear mientras lees esto.

## 1. Un recorrido en 30 segundos

| Página | Para qué sirve |
|---|---|
| **Panel** | Racha, tarjetas pendientes, tareas, mapa de actividad, captura rápida |
| **Notas** | Notas en Markdown con fórmulas, enlaces wiki, gráficos incrustados y citas |
| **Gráficos** | Gráficos desde datos pegados, trazador de funciones, líneas de tendencia, exportar PNG |
| **Finanzas** | Interés compuesto, presupuesto, cartera, préstamos, VAN/TIR, Monte Carlo, FIRE, opciones |
| **Estudio** | Tarjetas con repetición espaciada, temporizador Pomodoro, tareas |
| **Investigación** | Biblioteca de fuentes, citas APA/MLA/Chicago/BibTeX |
| **Laboratorio** | Estadística, regresión, distribución normal, planificador de notas, calculadora |

Pulsa **Ctrl+K** en cualquier sitio para buscar o saltar de página. Al final de la barra lateral puedes alternar modo claro/oscuro y cambiar el idioma entre **inglés (EN)** y **español (ES)**; se recuerda tu elección y este tutorial y los datos de ejemplo la siguen.

## 2. Notas

Las notas son Markdown y se guardan solas mientras escribes. Modos: *Dividido*, *Editar*, *Vista previa*; «Enfoque» activa el modo sin distracciones.

### Chuleta de sintaxis

| Escribes | Obtienes |
|---|---|
| `# Título`, `**negrita**`, `*cursiva*`, `- lista` | Markdown estándar (también tablas, código y citas) |
| `$E=mc^2$` y `$$\int_0^1 x^2dx$$` | **fórmulas LaTeX** en línea / en bloque (KaTeX) |
| `[[Otra nota]]` | **enlace wiki** (rojo = aún no existe; haz clic para crearla) |
| `#finanzas` en el texto | etiqueta clicable para filtrar |
| `- [ ] tarea` | casilla que puedes marcar en la vista previa |
| `![[chart:3]]` | incrusta el gráfico n.º 3 en vivo (usa el menú «Insertar gráfico») |
| `[@smith2020]` | cita → «(Smith & Doe, 2020)», enlazada a la biblioteca de fuentes |
| `Término :: Definición` | una línea de tarjeta |
| `La palabra {{oculta}} del hueco` | una tarjeta con hueco (cloze) |

### Consejos de flujo
1. Elige una **plantilla** (Cornell, Clase, Resumen de artículo, Análisis de acciones, Diario) antes de pulsar ＋.
2. Toma apuntes de la clase; marca los datos como `Pregunta :: Respuesta`.
3. Pulsa **Crear tarjetas**. Se añaden a un mazo con el nombre de la nota. Repetirlo nunca duplica tarjetas.
4. El panel **Enlaces entrantes** muestra qué notas enlazan aquí; **Esquema** lista tus encabezados.
5. Fija notas importantes, usa colores y exporta una nota como `.md`.

## 3. Gráficos

1. **＋ Nuevo gráfico** y elige un tipo: `barras`, `líneas`, `área`, `dispersión`, `circular`, `anillo`, `radar` o `función`.
2. Pega datos (directamente desde Excel/Sheets sirve): primera fila = cabeceras, primera columna = etiquetas:

   ```
   Año,Ingresos,Beneficio
   2021,130,18
   2022,160,25
   ```
3. Opciones: **línea de tendencia** (regresión lineal con R² en dispersión), apilado, eje Y logarítmico. Debajo del gráfico aparecen las estadísticas por columna (media, mín, máx, % de cambio).
4. **Trazador de funciones**: elige `función` e introduce p. ej. `sin(x); x^2/10; ncdf(x)` (usa `;` para varias curvas) con un rango de x. Admite: `+ - * / ^ %`, `sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs ln log log2 exp floor ceil round fact min max ncdf npdf erf`, constantes `pi e`. Funciona la multiplicación implícita (`2x`, `3sin(x)`).
5. **Guardar**, luego **Descargar PNG** o **Copiar código para notas** y pégalo en una nota.

## 4. Finanzas

Todas las calculadoras se recalculan con *Intro* o con su botón.

- **Interés compuesto**: capital inicial + ahorro mensual, con una línea «real» ajustada a la inflación. Muestra el tiempo de duplicación por la regla del 72.
- **Presupuesto**: registra ingresos (+) y gastos (−) con categorías; el flujo de caja mensual y el gráfico de gasto se actualizan solos. Importa CSV del banco (`date,description,amount,category`).
- **Cartera**: añade tickers (`AAPL`, o `sap.de` para no estadounidenses), acciones y coste. *Actualizar precios* descarga cotizaciones diarias de stooq.com; ¿sin conexión? escribe los precios a mano. «gráfico» muestra el histórico. Incluye el gráfico de distribución.
- **Préstamo**: cuota, intereses totales y el calendario completo; añade un *Extra / mes* para ver cuántos intereses ahorras.
- **VAN/TIR**: flujos como `-10000, 3000, 4000, 4500` con una tasa de descuento → VAN con aceptar/rechazar, TIR y plazo de recuperación.
- **Monte Carlo**: más de 1.000 trayectorias aleatorias muestran un *rango* (percentiles 10–90) de resultados y la probabilidad de alcanzar un objetivo. Sube la volatilidad para ver cómo se ensancha el embudo.
- **FIRE**: la cifra que necesitas (gasto ÷ tasa de retirada) y los años para alcanzarla.
- **Opciones**: Black–Scholes para call/put, delta, gamma, vega, theta y un gráfico de beneficio al vencimiento.

> Herramientas educativas, no asesoramiento financiero. Los modelos suponen rentabilidad y volatilidad constantes.

## 5. Estudio

### Tarjetas (repetición espaciada)
Abre **Estudio → Tarjetas → Repasar**. Haz clic en la tarjeta (o pulsa **Espacio**) para voltearla y valórate: **1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil**. Las etiquetas de los botones muestran el siguiente intervalo. StickPad usa el algoritmo **SM-2**: las tarjetas fáciles vuelven con intervalos cada vez mayores y las olvidadas reaparecen en la misma sesión. Repasa las pendientes cada día para proteger tu racha 🔥.

Añade tarjetas a mano, por importación masiva (`pregunta :: respuesta` por línea) o desde notas. Las tarjetas muestran Markdown y fórmulas.

### Temporizador de enfoque
Pomodoro con duraciones personalizables y una etiqueta de asignatura. El temporizador **sigue corriendo mientras cambias de página**, muestra la cuenta atrás en el título de la pestaña y suena/notifica al acabar un bloque. Los bloques completados se registran y se grafican por día y por asignatura.

### Tareas
Añade tareas con fecha, prioridad y asignatura. Las vencidas se ponen en rojo y aparecen en el panel.

### Asignaturas y notas
Abre **Estudio → Asignaturas y notas**.

1. Añade tus **asignaturas** con un porcentaje objetivo (la media que quieres en cada una).
2. Registra cada **nota** con su puntuación, sobre cuánto es (10, 100…), un peso (un examen puede contar más que un test) y una fecha. Las notas se convierten a porcentaje.
3. Interpreta los resultados:
   - **Evolución de las notas** (con líneas de tendencia opcionales) muestra quién mejora y quién se está quedando atrás.
   - **Tiempo de estudio vs. dónde lo necesitas** compara el porcentaje de tu tiempo de enfoque que recibió cada asignatura en los últimos 30 días con el que *debería* recibir. La recomendación crece con la distancia a tu objetivo y con las notas a la baja.
   - **Minutos de enfoque por semana** muestra cómo se movió tu tiempo entre asignaturas.
   - La tabla **Resumen** y las tarjetas destacadas señalan las asignaturas que *necesitan atención* (notas bajas o a la baja con poco tiempo de estudio) y las que tienen *demasiado enfoque* (ya por encima del objetivo pero con mucho tiempo).
4. Para el análisis de tiempo, inicia las sesiones Pomodoro con el **mismo nombre de asignatura** (el Temporizador te sugiere tus asignaturas).

## 6. Investigación

1. **＋ Fuente**, rellena los autores como `Apellido, Nombre; Apellido, Nombre`, año, título, revista, DOI.
2. Tras guardar verás versiones **APA / MLA / Chicago / BibTeX** para copiar.
3. Cita desde una nota con **Citar…** o escribiendo `[@apellidoAÑO]` (la clave aparece en cada fuente).
4. **Crear nota de lectura** genera una nota estructurada vinculada a la fuente.
5. **Bibliografía** genera la lista completa en el estilo elegido → copiar o descargar (`.bib` para LaTeX).

## 7. Laboratorio

- **Estadística**: pega números → media, mediana, moda, σ, cuartiles, RIC, asimetría, IC 95%, límites de atípicos, histograma.
- **Regresión**: pega x e y → pendiente, ordenada, r, R², estadístico t, predicción para cualquier x.
- **Dist. normal**: puntuaciones z y probabilidades P(X≤a), P(a≤X≤b) con una campana sombreada.
- **Planificador de notas**: ¿qué necesitas en el examen final para llegar a tu nota objetivo?
- **Calculadora**: calculadora científica con historial y `ans`.

## 8. Datos y copias de seguridad

- **Ayuda → Exportar** descarga todo en JSON; **Importar** fusiona una exportación anterior.
- **Borrar datos de ejemplo** elimina solo lo que creó *Cargar datos de ejemplo* (el Panel también ofrece el botón en un aviso); tus notas se conservan. **Borrar todos los datos** lo vacía todo tras una confirmación, así que exporta antes una copia de seguridad.
- La base de datos es un único archivo: `data/stickpad.db`. Cópialo para hacer una copia de seguridad. Define `STICKPAD_DB=/ruta/archivo.db` para moverlo.
- Para usar otro puerto: `PORT=8080 python app.py`.

## 9. Atajos de teclado

| Teclas | Acción |
|---|---|
| `Ctrl/Cmd+K` | Buscar / saltar |
| `Espacio` | Voltear tarjeta |
| `1`–`4` | Valorar tarjeta |
| `Tab` (en el editor) | Sangrar |
| `Intro` (en calculadoras) | Calcular |

## 10. Una sesión de estudio de ejemplo

1. Abre el Panel, pulsa **Estudio** (insignia de tarjetas pendientes) y limpia tus repasos (5 min).
2. Inicia un Pomodoro de 25 min con la etiqueta de la asignatura.
3. Toma apuntes con la plantilla *Clase*; marca los datos como `P :: R`; pulsa **Crear tarjetas**.
4. Lleva los números de una hoja de problemas a **Laboratorio → Regresión**; guarda el gráfico en **Gráficos** e incrústalo en la nota con `![[chart:ID]]`.
5. Cita el artículo que usaste con `[@clave]`; exporta la bibliografía al terminar.
