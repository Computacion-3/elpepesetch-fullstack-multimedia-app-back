-- Seed de desarrollo para la aplicación de gestión de bibliotecas multimedia.
-- Idempotente: puede ejecutarse varias veces sin duplicar registros.
--
-- Uso:
--   psql -h localhost -p 5433 -U postgres -d mydatabase -f db/seed.sql
--
-- Credenciales de prueba:
--   admin@example.com     / Admin1234
--   moderator@example.com / Moderator1234
--   user@example.com      / User12345
--
-- Las contraseñas son exclusivamente para desarrollo. Cámbialas antes de
-- utilizar estos usuarios en un entorno compartido o de producción.

BEGIN;

-- ---------------------------------------------------------------------------
-- Autenticación, roles y permisos
-- ---------------------------------------------------------------------------

INSERT INTO roles (name, description) VALUES
    ('USER', 'Usuario registrado: organiza su propia colección'),
    ('MODERATOR', 'Revisa elementos propuestos y reseñas reportadas'),
    ('ADMIN', 'Gestiona usuarios, roles, permisos y catálogo')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO permissions (name, description) VALUES
    ('users:manage', 'Gestionar usuarios, estados y roles'),
    ('roles:manage', 'Gestionar roles y sus permisos'),
    ('permissions:manage', 'Gestionar permisos'),
    ('catalog:read', 'Consultar el catálogo multimedia'),
    ('catalog:create', 'Proponer elementos para el catálogo'),
    ('catalog:update', 'Editar elementos del catálogo'),
    ('catalog:delete', 'Eliminar elementos del catálogo'),
    ('catalog:moderate', 'Aprobar o rechazar elementos propuestos'),
    ('genres:read', 'Consultar géneros'),
    ('genres:manage', 'Crear, editar y eliminar géneros'),
    ('library:read', 'Consultar bibliotecas'),
    ('library:create', 'Agregar elementos a una biblioteca'),
    ('library:update', 'Editar entradas de una biblioteca'),
    ('library:delete', 'Eliminar entradas de una biblioteca'),
    ('lists:create', 'Crear listas multimedia'),
    ('lists:update', 'Editar listas multimedia'),
    ('lists:delete', 'Eliminar listas multimedia'),
    ('reviews:create', 'Crear reseñas'),
    ('reviews:update', 'Editar reseñas propias'),
    ('reviews:delete', 'Eliminar reseñas'),
    ('reviews:moderate', 'Ocultar o restaurar reseñas reportadas'),
    ('reports:create', 'Reportar reseñas'),
    ('stats:read_global', 'Consultar estadísticas globales de la plataforma'),
    ('activity:read', 'Consultar el historial de actividad'),
    ('seed:manage', 'Ejecutar el cargue inicial de datos')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

-- Usuario: acciones sobre sus propios recursos y consultas generales.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'catalog:read', 'catalog:create', 'catalog:update',
    'genres:read', 'library:read', 'library:create', 'library:update',
    'library:delete', 'lists:create', 'lists:update', 'lists:delete',
    'reviews:create', 'reviews:update', 'reviews:delete', 'reports:create',
    'activity:read'
)
WHERE r.name = 'USER'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Moderador: permisos del usuario más moderación.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN (
    'catalog:read', 'catalog:create', 'catalog:update', 'catalog:moderate',
    'genres:read', 'library:read', 'library:create', 'library:update',
    'library:delete', 'lists:create', 'lists:update', 'lists:delete',
    'reviews:create', 'reviews:update', 'reviews:delete', 'reviews:moderate',
    'reports:create', 'activity:read'
)
WHERE r.name = 'MODERATOR'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Administrador: todos los permisos actuales y los que se agreguen al seed.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM role_permissions rp
      WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO users (
    username, email, password_hash, bio, full_name, role_id, is_active
)
SELECT v.username, v.email, v.password_hash, v.bio, v.full_name, r.id, true
FROM (VALUES
    ('admin', 'admin@example.com',
     '$2b$10$jptrr1TnSVWF9ku9exraX.hIBFU1BkISt1Pg5OP1/VNmgE/RaNDQW',
     'Administrador de prueba', 'Admin Prueba', 'ADMIN'),
    ('moderator', 'moderator@example.com',
     '$2b$10$SroC9vwOGaMqDN8YLFQb3esdykLL8pF/hGBvbC7.dg3QAe7gXnTty',
     'Moderador de prueba', 'Moderador Prueba', 'MODERATOR'),
    ('user', 'user@example.com',
     '$2b$10$.3VyvFTLQe.sEWoXNJXHYO8B0jyvjAdgW50EVBSizxyDxPCT5EWP.',
     'Usuario de prueba', 'Usuario Prueba', 'USER')
) AS v(username, email, password_hash, bio, full_name, role_name)
JOIN roles r ON r.name = v.role_name
ON CONFLICT (email) DO UPDATE
SET username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    bio = EXCLUDED.bio,
    role_id = EXCLUDED.role_id,
    is_active = true;

-- ---------------------------------------------------------------------------
-- Géneros
-- ---------------------------------------------------------------------------

INSERT INTO genres (id, name, description) VALUES
    ('00000000-0000-4000-8000-000000000001', 'Acción', 'Historias centradas en enfrentamientos y aventura'),
    ('00000000-0000-4000-8000-000000000002', 'Aventura', 'Exploración, viajes y descubrimientos'),
    ('00000000-0000-4000-8000-000000000003', 'Ciencia ficción', 'Tecnología, futuro y mundos especulativos'),
    ('00000000-0000-4000-8000-000000000004', 'Drama', 'Historias centradas en conflictos personales'),
    ('00000000-0000-4000-8000-000000000005', 'Fantasía', 'Mundos mágicos, criaturas y mitología'),
    ('00000000-0000-4000-8000-000000000006', 'Terror', 'Suspenso, horror y elementos sobrenaturales'),
    ('00000000-0000-4000-8000-000000000007', 'Comedia', 'Historias de humor y situaciones cómicas'),
    ('00000000-0000-4000-8000-000000000008', 'Romance', 'Historias de relaciones y vínculos afectivos'),
    ('00000000-0000-4000-8000-000000000009', 'Misterio', 'Investigaciones, secretos y enigmas'),
    ('00000000-0000-4000-8000-000000000010', 'Historia', 'Relatos ambientados en hechos o épocas históricas')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- Catálogo: cinco juegos, cinco películas y cinco libros.
-- Los tres primeros elementos de cada tipo son aprobados; el resto incluye
-- propuestas pendientes o rechazadas para probar los flujos de moderación.
-- ---------------------------------------------------------------------------

INSERT INTO media_items (
    id, title, type, description, release_year, creator, cover_url,
    platform, duration_minutes, pages, isbn, approval_status,
    rejection_reason, average_rating, ratings_count, created_by_id
)
SELECT
    v.id::uuid, v.title, v.type::media_items_type_enum, v.description,
    v.release_year, v.creator, v.cover_url, v.platform, v.duration_minutes,
    v.pages, v.isbn, v.approval_status::media_items_approval_status_enum,
    v.rejection_reason, v.average_rating, v.ratings_count, u.id
FROM (VALUES
    ('10000000-0000-4000-8000-000000000001', 'The Legend of Zelda: Breath of the Wild', 'GAME', 'Aventura de exploración en un mundo abierto.', 2017, 'Nintendo EPD', NULL, 'Nintendo Switch', NULL, NULL, NULL, 'APPROVED', NULL, 9.2, 2, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000002', 'Hades', 'GAME', 'Acción roguelike ambientada en la mitología griega.', 2020, 'Supergiant Games', NULL, 'PC', NULL, NULL, NULL, 'APPROVED', NULL, 8.8, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000003', 'Stardew Valley', 'GAME', 'Simulador de granja con exploración y relaciones.', 2016, 'ConcernedApe', NULL, 'PC', NULL, NULL, NULL, 'APPROVED', NULL, 8.5, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000004', 'Celeste', 'GAME', 'Plataformas y superación personal en una montaña.', 2018, 'Maddy Makes Games', NULL, 'PC', NULL, NULL, NULL, 'PENDING', NULL, 0, 0, 'user@example.com'),
    ('10000000-0000-4000-8000-000000000005', 'Proyecto Nebulosa', 'GAME', 'Propuesta de juego de ciencia ficción.', 2026, 'Usuario Prueba', NULL, 'PC', NULL, NULL, NULL, 'REJECTED', 'La propuesta necesita información adicional.', 0, 0, 'user@example.com'),
    ('10000000-0000-4000-8000-000000000006', 'The Matrix', 'MOVIE', 'Ciencia ficción sobre una realidad simulada.', 1999, 'Lana y Lilly Wachowski', NULL, NULL, 136, NULL, NULL, 'APPROVED', NULL, 9.0, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000007', 'El viaje de Chihiro', 'MOVIE', 'Aventura fantástica en un mundo de espíritus.', 2001, 'Hayao Miyazaki', NULL, NULL, 125, NULL, NULL, 'APPROVED', NULL, 9.5, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000008', 'El Padrino', 'MOVIE', 'Drama criminal sobre una familia de Nueva York.', 1972, 'Francis Ford Coppola', NULL, NULL, 175, NULL, NULL, 'APPROVED', NULL, 9.1, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000009', 'Horizonte Rojo', 'MOVIE', 'Propuesta de película de ciencia ficción.', 2026, 'Moderador Prueba', NULL, NULL, 110, NULL, NULL, 'PENDING', NULL, 0, 0, 'moderator@example.com'),
    ('10000000-0000-4000-8000-000000000010', 'La Noche Infinita', 'MOVIE', 'Propuesta de terror para revisión.', 2025, 'Usuario Prueba', NULL, NULL, 95, NULL, NULL, 'REJECTED', 'El título ya existe en el catálogo.', 0, 0, 'user@example.com'),
    ('10000000-0000-4000-8000-000000000011', 'Cien años de soledad', 'BOOK', 'Novela sobre la familia Buendía y Macondo.', 1967, 'Gabriel García Márquez', NULL, NULL, NULL, 496, '9780307474728', 'APPROVED', NULL, 9.4, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000012', '1984', 'BOOK', 'Novela distópica sobre vigilancia y control social.', 1949, 'George Orwell', NULL, NULL, NULL, 328, '9780451524935', 'APPROVED', NULL, 8.9, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000013', 'El nombre del viento', 'BOOK', 'Fantasía sobre la vida y las leyendas de Kvothe.', 2007, 'Patrick Rothfuss', NULL, NULL, NULL, 662, '9780756404741', 'APPROVED', NULL, 8.7, 1, 'admin@example.com'),
    ('10000000-0000-4000-8000-000000000014', 'Atlas de Mundos Perdidos', 'BOOK', 'Propuesta de novela fantástica.', 2026, 'Usuario Prueba', NULL, NULL, NULL, 280, '9780000000001', 'PENDING', NULL, 0, 0, 'user@example.com'),
    ('10000000-0000-4000-8000-000000000015', 'Manual de los Sueños', 'BOOK', 'Propuesta de libro para moderación.', 2025, 'Moderador Prueba', NULL, NULL, NULL, 210, '9780000000002', 'PENDING', NULL, 0, 0, 'moderator@example.com')
) AS v(id, title, type, description, release_year, creator, cover_url, platform, duration_minutes, pages, isbn, approval_status, rejection_reason, average_rating, ratings_count, email)
JOIN users u ON u.email = v.email
ON CONFLICT (id) DO UPDATE
SET approval_status = EXCLUDED.approval_status,
    rejection_reason = EXCLUDED.rejection_reason,
    average_rating = EXCLUDED.average_rating,
    ratings_count = EXCLUDED.ratings_count;

-- Relación catálogo-géneros.
INSERT INTO media_item_genres (media_item_id, genre_id)
SELECT m.id, g.id
FROM (VALUES
    ('10000000-0000-4000-8000-000000000001', 'Aventura'),
    ('10000000-0000-4000-8000-000000000001', 'Fantasía'),
    ('10000000-0000-4000-8000-000000000002', 'Acción'),
    ('10000000-0000-4000-8000-000000000002', 'Fantasía'),
    ('10000000-0000-4000-8000-000000000003', 'Aventura'),
    ('10000000-0000-4000-8000-000000000003', 'Comedia'),
    ('10000000-0000-4000-8000-000000000004', 'Drama'),
    ('10000000-0000-4000-8000-000000000004', 'Aventura'),
    ('10000000-0000-4000-8000-000000000005', 'Ciencia ficción'),
    ('10000000-0000-4000-8000-000000000006', 'Ciencia ficción'),
    ('10000000-0000-4000-8000-000000000007', 'Fantasía'),
    ('10000000-0000-4000-8000-000000000007', 'Aventura'),
    ('10000000-0000-4000-8000-000000000008', 'Drama'),
    ('10000000-0000-4000-8000-000000000009', 'Ciencia ficción'),
    ('10000000-0000-4000-8000-000000000010', 'Terror'),
    ('10000000-0000-4000-8000-000000000011', 'Drama'),
    ('10000000-0000-4000-8000-000000000011', 'Historia'),
    ('10000000-0000-4000-8000-000000000012', 'Ciencia ficción'),
    ('10000000-0000-4000-8000-000000000012', 'Drama'),
    ('10000000-0000-4000-8000-000000000013', 'Fantasía'),
    ('10000000-0000-4000-8000-000000000014', 'Fantasía'),
    ('10000000-0000-4000-8000-000000000015', 'Misterio')
) AS v(media_id, genre_name)
JOIN media_items m ON m.id = v.media_id::uuid
JOIN genres g ON g.name = v.genre_name
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bibliotecas personales
-- ---------------------------------------------------------------------------

INSERT INTO library_entries (
    id, user_id, media_item_id, status, progress, rating, is_favorite,
    notes, started_at, completed_at
)
SELECT
    v.id::uuid, u.id, v.media_id::uuid, v.status::library_entries_status_enum,
    v.progress, v.rating, v.is_favorite, v.notes,
    CASE WHEN v.status IN ('IN_PROGRESS', 'COMPLETED', 'DROPPED')
         THEN CURRENT_TIMESTAMP - INTERVAL '20 days' ELSE NULL END,
    CASE WHEN v.status = 'COMPLETED'
         THEN CURRENT_TIMESTAMP - INTERVAL '5 days' ELSE NULL END
FROM (VALUES
    ('20000000-0000-4000-8000-000000000001', 'user@example.com', '10000000-0000-4000-8000-000000000001', 'COMPLETED', 80, 9, true, 'Una de mis aventuras favoritas.'),
    ('20000000-0000-4000-8000-000000000002', 'user@example.com', '10000000-0000-4000-8000-000000000002', 'IN_PROGRESS', 12, NULL, true, 'Pendiente de terminar.'),
    ('20000000-0000-4000-8000-000000000003', 'user@example.com', '10000000-0000-4000-8000-000000000006', 'COMPLETED', 136, 10, true, 'Revisión de la película clásica.'),
    ('20000000-0000-4000-8000-000000000004', 'user@example.com', '10000000-0000-4000-8000-000000000011', 'IN_PROGRESS', 120, NULL, false, 'Lectura actual.'),
    ('20000000-0000-4000-8000-000000000005', 'moderator@example.com', '10000000-0000-4000-8000-000000000007', 'COMPLETED', 125, 9, true, 'Película recomendada.'),
    ('20000000-0000-4000-8000-000000000006', 'moderator@example.com', '10000000-0000-4000-8000-000000000013', 'DROPPED', 90, 7, false, 'Se retomará más adelante.'),
    ('20000000-0000-4000-8000-000000000007', 'user@example.com', '10000000-0000-4000-8000-000000000004', 'PENDING', 0, NULL, false, 'Propuesta propia pendiente de aprobación.')
) AS v(id, email, media_id, status, progress, rating, is_favorite, notes)
JOIN users u ON u.email = v.email
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    progress = EXCLUDED.progress,
    rating = EXCLUDED.rating,
    is_favorite = EXCLUDED.is_favorite,
    notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Listas personalizadas y sus elementos
-- ---------------------------------------------------------------------------

INSERT INTO user_lists (id, name, description, visibility, owner_id)
SELECT v.id::uuid, v.name, v.description, v.visibility::user_lists_visibility_enum, u.id
FROM (VALUES
    ('30000000-0000-4000-8000-000000000001', 'Favoritos para el fin de semana', 'Selección pública de juegos y películas.', 'PUBLIC', 'user@example.com'),
    ('30000000-0000-4000-8000-000000000002', 'Pendientes personales', 'Lista privada de títulos por comenzar.', 'PRIVATE', 'user@example.com'),
    ('30000000-0000-4000-8000-000000000003', 'Recomendaciones del moderador', 'Lista pública para la comunidad.', 'PUBLIC', 'moderator@example.com')
) AS v(id, name, description, visibility, email)
JOIN users u ON u.email = v.email
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    visibility = EXCLUDED.visibility;

INSERT INTO list_items (user_list_id, media_item_id)
SELECT l.id, m.id
FROM (VALUES
    ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006'),
    ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000011'),
    ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002'),
    ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004'),
    ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000007'),
    ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000012'),
    ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000013')
) AS v(list_id, media_id)
JOIN user_lists l ON l.id = v.list_id::uuid
JOIN media_items m ON m.id = v.media_id::uuid
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Reseñas, reportes e historial
-- ---------------------------------------------------------------------------

INSERT INTO reviews (
    id, user_id, media_item_id, title, content, is_hidden, hidden_reason
)
SELECT v.id::uuid, u.id, v.media_id::uuid, v.title, v.content, v.is_hidden, v.hidden_reason
FROM (VALUES
    ('40000000-0000-4000-8000-000000000001', 'user@example.com', '10000000-0000-4000-8000-000000000001', 'Una aventura inolvidable', 'El mundo abierto y la exploración hacen que cada partida se sienta especial.', false, NULL),
    ('40000000-0000-4000-8000-000000000002', 'user@example.com', '10000000-0000-4000-8000-000000000006', 'Un clásico imprescindible', 'Una película que sigue siendo relevante por su historia y sus ideas.', false, NULL),
    ('40000000-0000-4000-8000-000000000003', 'moderator@example.com', '10000000-0000-4000-8000-000000000007', 'Animación perfecta', 'La dirección artística y la música construyen una experiencia memorable.', false, NULL)
) AS v(id, email, media_id, title, content, is_hidden, hidden_reason)
JOIN users u ON u.email = v.email
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    content = EXCLUDED.content,
    is_hidden = EXCLUDED.is_hidden,
    hidden_reason = EXCLUDED.hidden_reason;

INSERT INTO review_reports (id, review_id, reporter_id, reason, details, status)
SELECT
    v.id::uuid, v.review_id::uuid, u.id,
    v.reason::review_reports_reason_enum, v.details,
    v.status::review_reports_status_enum
FROM (VALUES
    ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'user@example.com', 'OTHER', 'Reporte de ejemplo para probar la moderación.', 'OPEN')
) AS v(id, review_id, email, reason, details, status)
JOIN users u ON u.email = v.email
ON CONFLICT (id) DO UPDATE
SET reason = EXCLUDED.reason,
    details = EXCLUDED.details,
    status = EXCLUDED.status;

INSERT INTO activity_logs (
    id, user_id, action, media_item_id, library_entry_id, metadata
)
SELECT
    v.id::uuid, u.id, v.action::activity_logs_action_enum,
    NULLIF(v.media_id, '')::uuid, NULLIF(v.entry_id, '')::uuid,
    v.metadata::jsonb
FROM (VALUES
    ('60000000-0000-4000-8000-000000000001', 'user@example.com', 'ENTRY_ADDED', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '{"source":"seed"}'),
    ('60000000-0000-4000-8000-000000000002', 'user@example.com', 'STATUS_CHANGED', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '{"from":"PENDING","to":"IN_PROGRESS"}'),
    ('60000000-0000-4000-8000-000000000003', 'user@example.com', 'ENTRY_COMPLETED', '10000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', '{"rating":10}'),
    ('60000000-0000-4000-8000-000000000004', 'user@example.com', 'FAVORITE_TOGGLED', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '{"isFavorite":true}'),
    ('60000000-0000-4000-8000-000000000005', 'user@example.com', 'REVIEW_CREATED', '10000000-0000-4000-8000-000000000001', '', '{"reviewId":"40000000-0000-4000-8000-000000000001"}'),
    ('60000000-0000-4000-8000-000000000006', 'moderator@example.com', 'LIST_CREATED', '', '', '{"listId":"30000000-0000-4000-8000-000000000003"}')
) AS v(id, email, action, media_id, entry_id, metadata)
JOIN users u ON u.email = v.email
ON CONFLICT (id) DO UPDATE
SET action = EXCLUDED.action,
    metadata = EXCLUDED.metadata;

COMMIT;
