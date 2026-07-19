# Fuga Orbital

Endless runner: saltá sobre los trenes de un planeta alienígena. Cliente Canvas 2D (TypeScript + Vite) con backend propio (Fastify + Drizzle + Postgres) para cuentas, tienda, niveles, ranking y logros. El juego funciona 100% offline sin cuenta; con cuenta, sincroniza contra el servidor.

**En producción:** [fuga-orbital.netlify.app](https://fuga-orbital.netlify.app) (cliente, Netlify) · `https://fuga-orbital-production.up.railway.app` (servidor, Railway) · Postgres en Supabase.

## Estructura

```
/client   # Vite + TypeScript, Canvas 2D vanilla
/server   # Fastify + Drizzle ORM + Postgres (Supabase)
```

## Desarrollo local

### Servidor

```bash
cd server
cp .env.example .env      # completar DATABASE_URL, JWT_SECRET, COOKIE_SECRET
npm install
npm run db:migrate        # aplica las migraciones contra tu Postgres
npm run seed               # carga mejoras, cosméticos, niveles y logros
npm run dev                 # http://localhost:3001
```

### Cliente

```bash
cd client
cp .env.example .env      # VITE_API_URL, por defecto http://localhost:3001
npm install
npm run dev                 # http://localhost:5173
```

Sin `/server` corriendo, el cliente funciona igual (menú, jugar, tienda local, ajustes); las llamadas a la API fallan en silencio y no rompen nada — es el diseño offline-first del proyecto.

## Deploy (Supabase + Railway + Netlify)

Cliente estático en **Netlify**, servidor persistente en **Railway**, Postgres en **Supabase**. El servidor no es serverless: corre siempre, no hay cold starts que romper.

### 1. Supabase (base de datos)

1. Crear un proyecto nuevo en [supabase.com](https://supabase.com).
2. **Settings → Database → Connection string**, tab **"Session pooler"** (no "Direct connection"). La conexión directa resuelve a IPv6 y Railway no tiene salida IPv6 — da `ENETUNREACH` al conectar. El pooler resuelve a IPv4 y funciona sin problema (para dev local cualquiera de las dos sirve, pero usar el pooler desde el arranque evita tener que migrar la URL después).
3. En `/server`, local: `cp .env.example .env`, pegar esa URL en `DATABASE_URL`, generar `JWT_SECRET`/`COOKIE_SECRET` (por ejemplo `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, ejecutarlo dos veces para tener dos secretos distintos).
4. `npm run db:migrate && npm run seed` — aplica las 9 tablas y carga el catálogo inicial (mejoras, cosméticos, 3 niveles, 7 logros). Se corre una sola vez desde tu máquina; Railway no necesita volver a correrlo.

### 2. GitHub

Railway y Netlify se conectan a un repo de GitHub para redeployar automáticamente en cada push.

1. Crear un repositorio vacío en GitHub (sin README/gitignore/license, para no chocar con lo que ya existe acá).
2. Conectar este repo local y subirlo:
   ```bash
   git remote add origin <URL-del-repo>
   git push -u origin master
   ```

### 3. Railway (servidor)

1. **New Project → Deploy from GitHub repo** → elegir el repo.
2. Es un monorepo: en **Settings → Source → Root Directory**, poner `server`.
3. **Settings → Variables**, cargar:
   - `DATABASE_URL` (la de Supabase)
   - `JWT_SECRET`, `COOKIE_SECRET` (los generados antes — pueden ser los mismos que usaste local o nuevos, pero no reutilices secretos de desarrollo en producción si ya los compartiste en algún lado)
   - `CLIENT_ORIGIN` — de momento poné cualquier valor placeholder, se actualiza en el paso 5 con la URL real de Netlify
   - `NODE_ENV=production`
   - `PORT=3001` — **ponelo explícito.** Railway puede auto-asignar un puerto interno (ej. 8080) distinto del que después le decís al dominio público que use; si no coinciden da 502 "Application failed to respond". Fijando `PORT=3001` acá y usando ese mismo número al generar el dominio (paso 5) quedan sincronizados.
4. Railway detecta Node vía Nixpacks y usa los scripts `build`/`start` de `server/package.json` automáticamente. Si el primer deploy falla por eso, revisar en **Settings → Deploy** que el *Build Command* sea `npm run build` y el *Start Command* `npm start`.
5. Una vez que el deploy esté verde: **Settings → Networking → Generate Domain**, y cuando pida el puerto poné el mismo `3001` del paso anterior. Esa URL (`https://algo.up.railway.app`) es tu `VITE_API_URL`. Si igual da 502, revisá con `railway logs` en qué puerto quedó escuchando el server realmente y alineá la variable `PORT`.

### 4. Netlify (cliente)

1. **Add new site → Import an existing project** → el mismo repo de GitHub.
2. **Base directory**: `client`. Netlify va a levantar `client/netlify.toml` (ya está en el repo) para el build command (`npm run build`) y el publish directory (`dist`).
3. **Site configuration → Environment variables**: agregar `VITE_API_URL` con la URL de Railway del paso anterior.
4. Deploy. Anotar la URL de Netlify (`https://algo.netlify.app`, o el dominio propio si configurás uno).

### 5. Cerrar el círculo de CORS

Volver a Railway → **Variables** → actualizar `CLIENT_ORIGIN` con la URL real de Netlify del paso 4 (sin `/` final). Railway redeploya solo al cambiar una variable; si no, forzar un redeploy manual desde el dashboard.

### 6. Verificar

Abrir la URL de Netlify: jugar sin cuenta (debe sentirse igual que siempre), crear una cuenta desde el botón 👤, jugar una partida y confirmar que aparece en 🏆 Ranking, comprar algo en la tienda logueado y confirmar que el saldo lo valida el servidor.

## Regenerar el sitio tras cambios

Con GitHub conectado, cualquier `git push` a `master` redeploya cliente y servidor automáticamente. Si cambia el `schema.ts`, correr `npm run db:generate` local, revisar la migración generada en `server/drizzle/`, commitear y correr `npm run db:migrate` contra Supabase antes o después del push (las migraciones no las corre Railway solo).
