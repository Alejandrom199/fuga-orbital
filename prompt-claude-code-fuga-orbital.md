# Prompt para Claude Code — Reestructuración de Fuga Orbital

> Pega todo lo que sigue en Claude Code, con el archivo `fuga-orbital.html` en la raíz del repo.

---

Eres el arquitecto y desarrollador principal de **Fuga Orbital**, un minijuego plataformero tipo endless runner (saltar sobre trenes) que hoy vive completo en un solo archivo: `fuga-orbital.html` (HTML + CSS + ~80 KB de JS con canvas 2D, render procedimental, tienda con mejoras consumibles y cosméticos, persistencia en localStorage). **Léelo completo antes de escribir una sola línea**: es la fuente de verdad del gameplay y del estilo visual.

Tu misión es reestructurarlo como un proyecto profesional con arquitectura de videojuegos 2D, backend con usuarios y un sistema de diseño consistente, **sin cambiar cómo se siente ni cómo se juega**.

## Regla de oro

**Cero sobreingeniería.** Prohibido: ECS, Redis, microservicios, GraphQL, WebSockets, Docker en desarrollo, Prisma, monorepo tooling (Turborepo/Nx), tests E2E en esta fase. El juego es single-player con backend REST simple. Si dudas entre dos soluciones, elige la más simple que cumpla.

**Criterio de aceptación permanente:** al final de cada fase, el juego debe poder jugarse igual que el HTML original. El refactor es trasplante de código existente, no reescritura.

## Stack (no negociable)

- **Cliente:** TypeScript + Vite. Canvas 2D vanilla (el motor actual, sin frameworks de juego).
- **Servidor:** Node + Fastify + TypeScript.
- **Base de datos:** PostgreSQL (Supabase) vía **Drizzle ORM** (`drizzle-orm/postgres-js` + driver `postgres`). Migraciones con `drizzle-kit` leyendo `DATABASE_URL`.
- **Auth:** registro/login con nombre + contraseña, hash con argon2, sesión con cookie httpOnly firmada (`@fastify/cookie` + `@fastify/session` o JWT en cookie; elige una y justifícala en un comentario).
- **Validación:** Zod en los endpoints (o el schema validation nativo de Fastify).
- **Deploy objetivo:** cliente estático en Netlify, servidor en Railway, Postgres en Supabase (conexión directa 5432 o session pooler; el servidor es persistente, no serverless). Incluye `.env.example` y scripts de build para ambos.

## Estructura del repositorio

```
/client
  src/
    main.ts              # bootstrap: canvas, resize, arranque
    core/                # loop (rAF + delta time), input (teclado+touch), scene-manager
    scenes/              # menu, seleccion-niveles, juego, pausa, game-over, tienda, logros
    entities/            # jugador, enemigo, moneda, tren — interfaz común { update(dt), draw(ctx) }
    systems/             # spawner, colisiones, dificultad, particulas
    render/              # dibujos procedimentales (robot, enemigos, monedas, fondo)
    ui/                  # HUD y overlays DOM
    data/                # config.ts (constantes de gameplay), presets
    services/            # storage.ts (única puerta a localStorage), api.ts (fetch al backend)
    design/              # tokens.css + componentes de UI (ver Sistema de diseño)
/server
  src/
    index.ts
    db.ts                # conexión Drizzle
    schema.ts            # las 9 tablas
    seed.ts              # items, niveles y logros iniciales
    routes/              # auth, perfil, tienda, partidas, niveles, logros
    plugins/             # sesión/auth guard
/shared                  # tipos TS compartidos (Perfil, Item, Nivel, Logro, DTOs de la API)
```

## Arquitectura del cliente

1. **Máquina de estados de escenas.** Cada escena implementa `{ enter, update(dt), draw(ctx), exit }` y un `sceneManager.cambiar('juego', params)`. Las pantallas actuales alternadas con CSS pasan a ser escenas.
2. **Entidades con interfaz común**, clases simples. Nada de ECS.
3. **Config data-driven:** todas las constantes de gameplay (`GRAVITY`, `JUMP_VELOCITY`, `BASE_SPEED`, gaps, knockback, etc.) viven en `data/config.ts`. La escena de juego recibe un **preset**: el de "endless" o el `config` de un nivel — mismo motor para ambos modos.
4. **Offline-first:** `storage.ts` sigue siendo la fuente de verdad local. Sin sesión, el juego funciona 100% como hoy. Con sesión, `api.ts` sincroniza al terminar cada partida y en cada compra. Al registrarse por primera vez, migrar el perfil de localStorage al servidor.
5. Determinismo opcional por nivel: si el preset trae `semilla`, el spawner usa un PRNG sembrado (mulberry32 o similar) para que el trazado sea idéntico para todos.

## Modelo de datos (9 tablas — implementar tal cual en `schema.ts`)

**Identidad**
- `usuarios(id serial PK, nombre text unique not null, password_hash text not null, creado_en timestamptz default now())`

**Estado del jugador**
- `perfiles(usuario_id int PK/FK→usuarios, monedas int default 0, ajustes jsonb default '{}', actualizado_en timestamptz)` — se crea automáticamente al registrarse.

**Economía**
- `items(id serial PK, codigo text unique, tipo text check in ('mejora','cosmetico'), nombre text, descripcion text, icono text, costo int, metadata jsonb default '{}', activo bool default true)`
- `inventario(id serial PK, usuario_id FK, item_id FK, cantidad int default 0, equipado bool default false, unique(usuario_id, item_id))` — mejoras: `cantidad` = cargas; cosméticos: `cantidad = 1` + `equipado`.

**Telemetría**
- `partidas(id serial PK, usuario_id FK, modo text check in ('endless','nivel'), nivel_id FK nullable→niveles, puntos int, monedas_ganadas int, duracion_s int, mejoras_usadas jsonb default '{}', creado_en timestamptz)` + índice `(puntos desc)`.

**Progresión**
- `niveles(id serial PK, orden int unique, nombre text, config jsonb, objetivo jsonb, activo bool default true)`
- `progreso_niveles(usuario_id FK, nivel_id FK, completado bool default false, estrellas int default 0, mejor_puntuacion int default 0, intentos int default 0, PK(usuario_id, nivel_id))`
- `logros(id serial PK, codigo text unique, nombre text, descripcion text, icono text, condicion jsonb, recompensa int default 0, secreto bool default false, activo bool default true)`
- `logros_usuario(usuario_id FK, logro_id FK, desbloqueado_en timestamptz default now(), PK(usuario_id, logro_id))`

**Principios del modelo (respetar):**
- Lo derivable no se almacena: no existe columna `desbloqueado` en niveles (se calcula: nivel 1 siempre; nivel N si N-1 está `completado`), no existe tabla leaderboard (es `MAX(puntos)` por usuario sobre partidas endless), no se guarda progreso parcial de logros (se agrega al vuelo en `GET /logros`).
- **El servidor es el dueño de la economía:** el cliente pide "comprar item X"; el servidor verifica saldo, descuenta, registra — todo en una transacción SQL. El cliente jamás envía saldos.
- Anti-trampas proporcional: validación de cordura en `POST /partidas` (límites de puntos/segundo, duración razonable) + rate limiting. Nada más.

## API REST

- `POST /auth/registro`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/yo`
- `GET /perfil`, `PUT /perfil/ajustes`
- `GET /tienda` (catálogo activo + inventario del usuario), `POST /tienda/comprar`, `POST /tienda/equipar`, `POST /tienda/preparar` (activar cargas de mejoras para la próxima partida)
- `POST /partidas` — guarda la partida y, en la misma transacción: acredita monedas, evalúa objetivo del nivel (upsert en `progreso_niveles`), evalúa logros pendientes (inserta en `logros_usuario`, acredita recompensas) y responde `{ partida, logrosDesbloqueados[], nivelCompletado? }`
- `GET /ranking?limite=20`
- `GET /niveles` (catálogo + progreso + `desbloqueado` calculado), con verificación server-side al reportar partidas de nivel
- `GET /logros` (catálogo visible + desbloqueados + progreso calculado de los acumulativos; los `secreto` no desbloqueados se devuelven ocultos)

**Evaluador de logros:** una única función genérica. Condiciones JSONB con dos ámbitos: `{"ambito":"partida","campo":"duracion_s","op":">=","valor":60}` (contra la fila recién insertada) y `{"ambito":"total","campo":"partidas_jugadas","op":">=","valor":50}` (contra agregados del usuario). Agregar un logro = un INSERT, cero código.

## Seed inicial (`seed.ts`)

- **Items:** las 4 mejoras (vidas 400, imán 250, salto 300, multiplicador 350) y los 6 cosméticos (gorra 450, gafas 500, capa 700, antena 400, bufanda 420, corona 650) que ya existen en el HTML — extrae nombres, descripciones e iconos de ahí.
- **Niveles:** 3 de ejemplo con dificultad creciente; `config` = preset de constantes del motor (+ `semilla`), `objetivo` tipo `{"tipo":"distancia"|"monedas"|"sobrevivir_s","valor":n}`.
- **Logros:** Primer salto (1 partida jugada), Superviviente (60 s en una run), Cazarrecompensas (100 monedas en una run), Maratonista (50 partidas), Coleccionista (6 cosméticos comprados), Estrella fugaz (3 estrellas en un nivel), Constelación (15 estrellas acumuladas).

## Sistema de diseño (obligatorio)

Crear `client/src/design/tokens.css` con variables CSS y refactorizar TODO el CSS del juego para consumirlas. La estética ya existe en el HTML — espacio profundo con neones — formalízala, no la inventes:

**Tokens de color** (extraídos del juego actual; nómbralos por rol, no por color):
- Fondos: `--fondo-espacio: #05010f`, `--fondo-panel: #100626` (paneles con transparencia tipo `rgba(20,10,40,.55)` + `backdrop-filter: blur`)
- Texto: `--texto-principal: #f2ecff`, `--texto-suave: #eaf6ff`, `--texto-atenuado: #cabfe8`
- Acentos neón: `--neon-cian: #7cf7ff` (HUD/puntuación), `--neon-magenta: #ff7ce8` (destacados), `--neon-violeta: #dcd2f7` y borde `rgba(180,120,255,.5)` (botones/paneles), `--neon-azul: #7c9bff`
- Semánticos: `--oro: #ffe27c` (monedas, estrellas, recompensas), `--peligro: #ff5c7a` (daño, vidas, errores)
- Glow: sombras `drop-shadow`/`text-shadow` estandarizadas en 2 intensidades (`--glow-suave`, `--glow-fuerte`); el glow es identidad del juego, pero solo en elementos interactivos o de estado — no en texto largo.

**Tokens de forma y espaciado:** escala de espaciado 4/8/12/16/24/32 px; radios `--radio-control: 8px`, `--radio-panel: 16px`; tipografía: la familia actual del juego, escala 13/15/17/22/28 px con dos pesos (400/700).

**Componentes UI** (en `design/` o `ui/`, HTML+CSS reutilizable; documenta cada uno con un comentario de uso):
- Botón primario / secundario / icono (estados: normal, hover, active, disabled)
- Panel modal (base compartida por pausa, game-over, tienda, ajustes)
- Tabs (tienda: mejoras/cosméticos)
- Tarjeta de item de tienda (icono, nombre, descripción, precio en oro, botón por estado: comprar / preparar / equipado / agotado / max)
- Tarjeta de nivel (número, nombre, 0-3 estrellas en oro, candado si bloqueado)
- Tarjeta de logro (icono, nombre, descripción, barra de progreso en acumulativos, estado bloqueado/desbloqueado, variante secreta "???")
- Toast de notificación (logro desbloqueado, nivel completado, error de red) — no intrusivo, esquina superior, auto-cierre
- HUD (vidas, puntuación, tiempo) — mantener el actual, solo migrar a tokens

**Reglas del sistema:** ningún color/tamaño/sombra hardcodeado fuera de `tokens.css`; todo estado interactivo tiene feedback visible; touch targets ≥ 44px en móvil (el juego ya es responsive y con soporte táctil — consérvalo); contraste legible del texto sobre los fondos oscuros.

## Orden de ejecución (una fase por vez, juego jugable al cierre de cada una)

1. **Fase 1 — Refactor cliente:** Vite + TS, trasplantar el HTML a la estructura de módulos con máquina de escenas, entidades y config data-driven. Extraer `tokens.css` y migrar el CSS existente. Resultado: mismo juego, nueva arquitectura.
2. **Fase 2 — Backend núcleo:** Fastify + Drizzle + `schema.ts` (9 tablas) + migraciones + seed + auth + `POST /partidas` + `GET /ranking`.
3. **Fase 3 — Integración:** `api.ts`, login/registro en el menú, sincronización offline-first, migración del perfil local, escena de ranking.
4. **Fase 4 — Tienda server-side:** endpoints de tienda, catálogo desde DB, compra/equipar/preparar con transacciones.
5. **Fase 5 — Niveles:** escena selección de niveles con las tarjetas del sistema de diseño, presets, desbloqueo secuencial verificado en servidor, estrellas.
6. **Fase 6 — Logros:** evaluador genérico, escena de logros, toasts.
7. **Fase 7 — Deploy:** builds, `.env.example`, CORS correcto entre Netlify y Railway, instrucciones en README.

Al iniciar, presenta un plan corto de la Fase 1 y espera confirmación antes de escribir código. En cada fase, termina indicando cómo probarla manualmente.
