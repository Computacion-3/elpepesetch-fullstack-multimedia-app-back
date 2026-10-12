# Elpepesetch — API de bibliotecas multimedia

API REST en NestJS para gestionar bibliotecas personales de juegos, películas y libros: catálogo moderado, progreso y calificaciones, listas, reseñas con moderación, estadísticas e historial. Usa PostgreSQL con TypeORM, autenticación JWT y autorización por roles y permisos.

- **API desplegada:** https://elpepesetch-fullstack-multimedia-app-back.onrender.com
- **Swagger desplegado:** https://elpepesetch-fullstack-multimedia-app-back.onrender.com/api/docs
- **Informe:** [`docs/Informe.md`](docs/Informe.md) · **Especificación:** [`docs/Taller Nest - Aplicacion de Gestion de Librerias Multimedia.md`](docs/Taller%20Nest%20-%20Aplicacion%20de%20Gestion%20de%20Librerias%20Multimedia.md)

## Requisitos

- Node.js 24 y npm
- Docker y Docker Compose (para PostgreSQL en local)
- `psql` solo si se carga el seed desde Windows con el script de PowerShell

## Ejecutar la aplicación en local

1. **Instalar dependencias**

    ```bash
    npm install
    ```

2. **Configurar el entorno**: copiar `.env.example` a `.env`. Los valores por defecto sirven para local; la API queda en el puerto `PORT` (3002 en el ejemplo) y PostgreSQL en `POSTGRES_PORT` (5433).

    ```bash
    cp .env.example .env
    ```

    Variables obligatorias: `JWT_SECRET` (la app no arranca sin ella), `JWT_EXPIRES_IN`, `SALT_QTY`, `DB_HOST` y las `POSTGRES_*`. `DB_SSL=true` solo para bases en la nube que exigen SSL.

3. **Levantar PostgreSQL**

    ```bash
    docker compose up -d db
    ```

4. **Arrancar la API una vez** para que TypeORM cree las tablas (`synchronize: true`):

    ```bash
    npm run start:dev
    ```

5. **Cargar los datos iniciales** (con la API ya arrancada al menos una vez). El seed es idempotente: puede ejecutarse varias veces.
    - **Windows:**

        ```powershell
        powershell -ExecutionPolicy Bypass -File .\scripts\seed-db.ps1
        ```

    - **Linux / macOS:** ejecutar `psql` dentro del contenedor de `docker compose`, que ya tiene el usuario y la base configurados:

        ```bash
        docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < db/seed.sql
        ```

6. **Abrir Swagger** en `http://localhost:3002/api/docs` (o el `PORT` configurado).

Otros modos: `npm run start` (sin recarga) y `npm run build && npm run start:prod` (producción).

## Usuarios de prueba

El seed crea tres usuarios, uno por rol, junto con géneros, catálogo, bibliotecas, listas, reseñas y reportes de ejemplo:

| Rol | Correo | Contraseña | Puede, además de lo del rol anterior |
| --- | --- | --- | --- |
| `USER` | `user@example.com` | `User12345` | Biblioteca, listas, reseñas, reportes, proponer elementos al catálogo |
| `MODERATOR` | `moderator@example.com` | `Moderator1234` | Aprobar o rechazar elementos y resolver reportes de reseñas |
| `ADMIN` | `admin@example.com` | `Admin1234` | Usuarios, roles, permisos, géneros, eliminar del catálogo, estadísticas globales |

La base desplegada en Render ya tiene estos datos cargados: basta con iniciar sesión.

## Cómo probar cada funcionalidad

Hay dos caminos, y ambos sirven en local o contra la URL de Render:

- **Postman (recomendado):** importar `postman/Elpepesetch-Reviews-Reports-Stats.postman_collection.json` y ajustar la variable de colección `baseUrl` (`http://localhost:3002` con el `.env` de ejemplo, o la URL de Render). Ejecutar la colección completa con *Run collection*: inicia sesión con los tres roles, guarda los tokens, recorre todos los módulos en orden con aserciones de estado y contenido, y limpia los datos temporales al final.
- **Swagger:** en `/api/docs`, ejecutar `POST /auth/login`, copiar el `accessToken` y pulsar **Authorize**. Para comparar roles, repetir el login con otro usuario.

Todas las rutas requieren `Authorization: Bearer <token>`, salvo registro, login y Swagger. Sin token la respuesta es 401; con un rol sin permiso, 403.

### 1. Autenticación

| Paso | Petición | Resultado esperado |
| --- | --- | --- |
| Registro | `POST /auth/register` con `username`, `email`, `password` (mín. 8, con mayúscula, minúscula y número) | 201, usuario con rol `USER`, sin contraseña en la respuesta. Enviar `roleId` responde 400 |
| Login | `POST /auth/login` con `email` y `password` | 200 con `accessToken`; credenciales erróneas, 401 |
| Perfil | `GET /auth/me` | 200 con el usuario autenticado |
| Logout | `POST /auth/logout` y luego `GET /auth/me` con el mismo token | 204 y después 401: el token queda revocado |

### 2. Usuarios, roles y permisos (autorización)

| Paso | Petición | Resultado esperado |
| --- | --- | --- |
| Editar perfil propio | `PATCH /users/me` | 200; enviar `roleId` responde 400 |
| Listar usuarios | `GET /users?role=USER&isActive=true&q=user&page=1&limit=10` como `ADMIN` | 200 con `{ data, meta }`; como `USER`, 403 |
| Asignar rol | `PATCH /users/:id/roles` con `{ "roleId": 2 }` como `ADMIN` | 200; aplica desde la siguiente petición del usuario |
| Desactivar cuenta | `PATCH /users/:id/status` con `{ "isActive": false }` como `ADMIN` | El usuario ya no puede iniciar sesión; desactivarse a sí mismo responde 400 |
| Roles y permisos | `GET/POST /roles`, `PUT /roles/:id/permissions`, `GET/POST /permissions` como `ADMIN` | Gestión de roles y de sus permisos |

### 3. Géneros y catálogo

| Paso | Petición | Resultado esperado |
| --- | --- | --- |
| Consultar | `GET /genres`, `GET /media?type=GAME&q=hades&sortBy=title&page=1&limit=10`, `GET /media/:id` | Géneros; catálogo aprobado paginado con filtros; detalle con géneros y calificación promedio |
| Proponer | `POST /media` como `USER` con `title`, `type`, `releaseYear`, `creator` y `genreIds` | 201 con `approvalStatus: PENDING`; visible solo para su creador y los moderadores |
| Editar propuesta | `PATCH /media/:id` como su creador | 200 mientras esté `PENDING`; 403 una vez revisada |
| Moderar | `GET /media/pending` y `PATCH /media/:id/approval` como `MODERATOR`, con `{ "approvalStatus": "APPROVED" }` o `REJECTED` + `rejectionReason` | Aprueba o rechaza; rechazar sin motivo, 400; revisar dos veces, 409 |
| Administrar | `POST/PATCH/DELETE /genres` y `DELETE /media/:id` como `ADMIN` | Como `USER`, 403; borrar un género en uso, 409 |

### 4. Biblioteca, listas e historial

| Paso | Petición | Resultado esperado |
| --- | --- | --- |
| Agregar a la biblioteca | `POST /library` con `{ "mediaItemId": "<uuid>" }` | 201 en estado `PENDING`; agregarlo de nuevo, 409 |
| Progreso y calificación | `PATCH /library/:id` con `status`, `progress`, `rating` (1–10), `isFavorite`, `notes` | El estado avanza solo con el progreso; calificar en `PENDING` o superar el máximo de páginas o minutos, 400 |
| Consultar | `GET /library?status=COMPLETED&type=BOOK&sortBy=addedAt&order=DESC` | Biblioteca propia paginada |
| Listas | `POST /lists`, `POST /lists/:id/items`, `GET /lists/public` | Listas propias; las públicas de otros muestran el username del dueño; una privada ajena responde 404 |
| Historial | `GET /activity?page=1&limit=20` | Actividad propia, más reciente primero |

### 5. Reseñas, reportes y estadísticas

| Paso | Petición | Resultado esperado |
| --- | --- | --- |
| Reseñar | `POST /media/:id/reviews` con `content` (el elemento debe estar en la biblioteca en `IN_PROGRESS`, `COMPLETED` o `DROPPED`) | 201; una segunda reseña del mismo elemento, 409 |
| Reportar | `POST /reviews/:id/report` con `reason` (`SPOILER`, `OFFENSIVE`, `SPAM`, `OTHER`) desde otro usuario | 201; reportar la propia, 400; reportar dos veces, 409 |
| Moderar reportes | `GET /reports?status=OPEN` y `PATCH /reports/:id/resolve` con `HIDE` + `reason`, o `DISMISS`, como `MODERATOR` | `HIDE` oculta la reseña; `DISMISS` la deja visible |
| Estadísticas | `GET /stats/me` (cualquier usuario) y `GET /stats/global` (`ADMIN`) | Totales por tipo y estado, top géneros, completados por mes y promedio; totales globales |

## Pruebas automatizadas

```bash
npm run test       # unitarias (Vitest)
npm run test:cov   # unitarias con cobertura
npm run test:e2e   # E2E (Supertest), requieren PostgreSQL
```

Las E2E vacían tablas, por eso solo se ejecutan si `POSTGRES_DB` contiene «test». Para correrlas en local, crear una base de pruebas y apuntar a ella (las tablas se crean al iniciar):

```bash
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" mydatabase_test'
POSTGRES_DB=mydatabase_test npm run test:e2e
```

GitHub Actions (`.github/workflows/ci.yml`) ejecuta lint, pruebas unitarias y E2E con un servicio de PostgreSQL en cada push y pull request a `master`.

## Despliegue (Docker + Render)

- La API corre en un *Web Service* de Render construido con el `Dockerfile` (multi-stage, Node 24, usuario sin privilegios), y la base de datos es un PostgreSQL administrado por Render, conectado por la red interna.
- **La base desplegada ya tiene cargados los datos del seed**, así que se puede iniciar sesión directamente con los usuarios de prueba.
- Si el servicio está en el plan gratuito de Render, se suspende tras un rato sin tráfico y la primera petición puede tardar cerca de un minuto mientras arranca.
- **Entrega continua:** `.github/workflows/cd.yml` se ejecuta al terminar el CI y, solo si las pruebas pasaron en un push a `master`, llama al *Deploy Hook* de Render guardado como secreto `RENDER_DEPLOY_HOOK_URL`.

Para desplegar una instancia propia:

1. Crear en Render una base PostgreSQL y un *Web Service* desde este repositorio con runtime **Docker**.
2. Configurar `DB_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` con los datos internos de la base, `DB_SSL=false`, un `JWT_SECRET` nuevo, `JWT_EXPIRES_IN` y `SALT_QTY`.
3. Tras el primer arranque, cargar el seed desde tu equipo con la URL externa: `psql "<URL externa>" -f db/seed.sql`.

Para probar la imagen en local:

```bash
docker build -t elpepesetch-back .
docker run --env-file .env -e DB_HOST=host.docker.internal -p 3002:3002 elpepesetch-back
```

En Linux, agregar `--add-host=host.docker.internal:host-gateway`.
