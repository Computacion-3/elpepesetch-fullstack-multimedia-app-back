import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './../src/app.module.js';
import { setupSwagger } from './../src/common/swagger/setup-swagger.js';

// Requiere PostgreSQL (variables POSTGRES_* / DB_HOST) y JWT_SECRET en el entorno.
describe('Seguridad: autenticación y autorización (e2e)', () => {
    let app: INestApplication<App>;
    let adminToken: string;
    let userToken: string;

    const login = async (email: string, password: string) =>
        (await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200)).body
            .accessToken as string;

    beforeAll(async () => {
        // Este suite hace TRUNCATE de tablas: nunca debe correr contra una base de datos de desarrollo o producción
        if (!/test/i.test(process.env.POSTGRES_DB ?? '')) {
            throw new Error('Los e2e solo se ejecutan si POSTGRES_DB contiene "test" (se vacían las tablas).');
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleFixture.createNestApplication();
        setupSwagger(app);
        await app.init();

        // Datos mínimos y aislados: roles, permiso users:manage y un usuario por rol
        const db = app.get(DataSource);
        await db.query(`TRUNCATE users, role_permissions, permissions, roles, revoked_tokens RESTART IDENTITY CASCADE`);
        await db.query(`INSERT INTO roles (name, description) VALUES ('USER','u'),('ADMIN','a')`);
        await db.query(`INSERT INTO permissions (name, description) VALUES ('users:manage','m')`);
        await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (2, 1)`);
        const hash = bcrypt.hashSync('Secreta123', 4);
        await db.query(
            `INSERT INTO users (username, email, password_hash, role_id) VALUES
             ('admin','admin@test.com',$1,2), ('normal','user@test.com',$1,1)`,
            [hash],
        );

        adminToken = await login('admin@test.com', 'Secreta123');
        userToken = await login('user@test.com', 'Secreta123');
    });

    afterAll(async () => {
        await app.close();
    });

    describe('rutas públicas', () => {
        it('Swagger responde sin token en /api/docs', () => request(app.getHttpServer()).get('/api/docs').expect(200));

        it('registro crea un usuario con rol USER y no devuelve la contraseña', async () => {
            const { body } = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ username: 'nuevo_1', email: 'nuevo@test.com', password: 'Secreta123' })
                .expect(201);
            expect(body.role.name).toBe('USER');
            expect(JSON.stringify(body)).not.toMatch(/password|\$2[aby]\$/i);
        });

        it('registro rechaza intentar elegir el rol (400)', () =>
            request(app.getHttpServer())
                .post('/auth/register')
                .send({ username: 'hack_1', email: 'hack@test.com', password: 'Secreta123', roleId: 2 })
                .expect(400));

        it('registro con correo repetido responde 409', () =>
            request(app.getHttpServer())
                .post('/auth/register')
                .send({ username: 'otro_1', email: 'nuevo@test.com', password: 'Secreta123' })
                .expect(409));

        it('login con credenciales erróneas responde 401', () =>
            request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'user@test.com', password: 'Incorrecta1' })
                .expect(401));
    });

    describe('401: autenticación', () => {
        it('sin token', () => request(app.getHttpServer()).get('/auth/me').expect(401));

        it('token inválido', () =>
            request(app.getHttpServer()).get('/auth/me').set('Authorization', 'Bearer no.es.jwt').expect(401));

        it('token válido da acceso', async () => {
            const { body } = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);
            expect(body.email).toBe('user@test.com');
        });
    });

    describe('403: autorización por rol/permiso', () => {
        it('un usuario sin users:manage no lista usuarios', () =>
            request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${userToken}`).expect(403));

        it('un usuario sin users:manage no asigna roles', () =>
            request(app.getHttpServer())
                .patch('/users/1/roles')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ roleId: 2 })
                .expect(403));

        it('el administrador lista usuarios sin exponer hashes', async () => {
            const { body } = await request(app.getHttpServer())
                .get('/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            expect(body.length).toBeGreaterThan(0);
            expect(JSON.stringify(body)).not.toMatch(/password|\$2[aby]\$/i);
        });
    });

    describe('propiedad del recurso', () => {
        it('PATCH /users/me solo modifica la cuenta del token', async () => {
            await request(app.getHttpServer())
                .patch('/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ bio: 'mi bio' })
                .expect(200);

            const { body } = await request(app.getHttpServer())
                .get('/users/2')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            expect(body.bio).toBe('mi bio');
            const admin = await request(app.getHttpServer())
                .get('/users/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);
            expect(admin.body.bio).not.toBe('mi bio');
        });

        it('un usuario no puede escalar su rol desde /users/me (400)', () =>
            request(app.getHttpServer())
                .patch('/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ roleId: 2 })
                .expect(400));
    });

    describe('PATCH /users/:id/status', () => {
        it('un usuario sin users:manage recibe 403', () =>
            request(app.getHttpServer())
                .patch('/users/2/status')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ isActive: false })
                .expect(403));

        it('el administrador no puede desactivar su propia cuenta (400)', () =>
            request(app.getHttpServer())
                .patch('/users/1/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false })
                .expect(400));

        it('rechaza un valor no booleano (400)', () =>
            request(app.getHttpServer())
                .patch('/users/2/status')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: 'no' })
                .expect(400));

        it('desactivar bloquea login y tokens vigentes; reactivar los restablece', async () => {
            const victim = await request(app.getHttpServer())
                .post('/auth/register')
                .send({ username: 'victima_1', email: 'victima@test.com', password: 'Secreta123' })
                .expect(201);
            const victimToken = await login('victima@test.com', 'Secreta123');

            const off = await request(app.getHttpServer())
                .patch(`/users/${victim.body.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: false })
                .expect(200);
            expect(off.body.isActive).toBe(false);

            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'victima@test.com', password: 'Secreta123' })
                .expect(401);
            await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${victimToken}`)
                .expect(401);

            await request(app.getHttpServer())
                .patch(`/users/${victim.body.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ isActive: true })
                .expect(200);
            await login('victima@test.com', 'Secreta123');
        });
    });

    describe('perfil: fullName y updatedAt', () => {
        it('PATCH /users/me guarda fullName y refresca updatedAt', async () => {
            const before = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            const { body } = await request(app.getHttpServer())
                .patch('/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ fullName: 'Nombre Completo' })
                .expect(200);

            expect(body.fullName).toBe('Nombre Completo');
            expect(new Date(body.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(before.body.updatedAt).getTime());
            expect(body.isActive).toBe(true);
        });

        it('rechaza un fullName de más de 100 caracteres (400)', () =>
            request(app.getHttpServer())
                .patch('/users/me')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ fullName: 'x'.repeat(101) })
                .expect(400));
    });

    describe('logout', () => {
        it('revoca el token: deja de ser válido aunque no haya expirado', async () => {
            const token = await login('user@test.com', 'Secreta123');
            await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(200);

            await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${token}`).expect(204);

            await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${token}`).expect(401);
        });

        it('cerrar sesión no invalida otras sesiones del mismo usuario', async () => {
            const other = await login('user@test.com', 'Secreta123');
            await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${other}`).expect(200);
        });
    });
});
