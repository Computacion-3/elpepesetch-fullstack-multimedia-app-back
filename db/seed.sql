-- Seed inicial de roles, permisos y usuarios de prueba. Idempotente: se puede ejecutar varias veces.
-- Requiere que las tablas existan (la app las crea al arrancar con synchronize).
-- Uso: psql -h localhost -p 5433 -U postgres -d mydatabase -f db/seed.sql
-- IMPORTANTE: las contraseñas de abajo son solo para desarrollo; cámbialas antes de desplegar.
--   admin@example.com / Admin1234   moderator@example.com / Moderator1234   user@example.com / User12345

INSERT INTO roles (name, description) VALUES
    ('USER', 'Usuario registrado: organiza su propia colección'),
    ('MODERATOR', 'Revisa elementos propuestos y reseñas reportadas'),
    ('ADMIN', 'Gestiona usuarios, roles, permisos y catálogo')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
    ('users:manage', 'Gestionar usuarios y asignar roles'),
    ('roles:manage', 'Gestionar roles y sus permisos'),
    ('permissions:manage', 'Gestionar permisos')
ON CONFLICT (name) DO NOTHING;

-- ADMIN recibe todos los permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO users (username, email, password_hash, bio, full_name, role_id)
SELECT v.username, v.email, v.password_hash, v.bio, v.full_name, r.id
FROM (VALUES
    ('admin', 'admin@example.com', '$2b$10$jptrr1TnSVWF9ku9exraX.hIBFU1BkISt1Pg5OP1/VNmgE/RaNDQW', 'Administrador de prueba', 'Admin Prueba', 'ADMIN'),
    ('moderator', 'moderator@example.com', '$2b$10$SroC9vwOGaMqDN8YLFQb3esdykLL8pF/hGBvbC7.dg3QAe7gXnTty', 'Moderador de prueba', 'Moderador Prueba', 'MODERATOR'),
    ('user', 'user@example.com', '$2b$10$.3VyvFTLQe.sEWoXNJXHYO8B0jyvjAdgW50EVBSizxyDxPCT5EWP.', 'Usuario de prueba', 'Usuario Prueba', 'USER')
) AS v(username, email, password_hash, bio, full_name, role_name)
JOIN roles r ON r.name = v.role_name
ON CONFLICT (email) DO NOTHING;
