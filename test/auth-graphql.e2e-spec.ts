import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './../src/app.module.js';

const LOGIN = `mutation Login($input: LoginInput!) {
    login(input: $input) { accessToken tokenType user { id username email role } }
}`;
const REGISTER = `mutation Register($input: RegisterInput!) {
    register(input: $input) { id username role { name } }
}`;
const ME = `{ me { id username role { name rolePermissions { permission { name } } } } }`;

// Requiere PostgreSQL (variables POSTGRES_* / DB_HOST) y JWT_SECRET en el entorno.
describe('Autenticación por GraphQL (e2e)', () => {
    let app: INestApplication;

    const gql = (query: string, variables?: object, token?: string) => {
        const req = request(app.getHttpServer()).post('/graphql');
        if (token) req.set('Authorization', `Bearer ${token}`);
        return req.send({ query, variables });
    };

    /** Los errores de Nest llegan en extensions.originalError, con el mismo statusCode y mensaje que en REST. */
    const originalError = (body: { errors: { extensions: { originalError: unknown } }[] }) =>
        body.errors[0].extensions.originalError;

    const login = async (email: string, password: string) =>
        (await gql(LOGIN, { input: { email, password } })).body.data.login.accessToken as string;

    beforeAll(async () => {
        // Este suite hace TRUNCATE de tablas: nunca debe correr contra una base de datos de desarrollo o producción
        if (!/test/i.test(process.env.POSTGRES_DB ?? '')) {
            throw new Error('Los e2e solo se ejecutan si POSTGRES_DB contiene "test" (se vacían las tablas).');
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();

        // Datos mínimos y aislados: roles, permiso users:manage y un administrador
        const db = app.get(DataSource);
        await db.query(`TRUNCATE users, role_permissions, permissions, roles, revoked_tokens RESTART IDENTITY CASCADE`);
        await db.query(`INSERT INTO roles (name, description) VALUES ('USER','u'),('ADMIN','a')`);
        await db.query(`INSERT INTO permissions (name, description) VALUES ('users:manage','m')`);
        await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (2, 1)`);
        await db.query(
            `INSERT INTO users (username, email, password_hash, role_id) VALUES ('admin','admin@test.com',$1,2)`,
            [bcrypt.hashSync('Secreta123', 4)],
        );
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    describe('login', () => {
        it('devuelve el token y los datos básicos del usuario', async () => {
            const { body } = await gql(LOGIN, { input: { email: 'admin@test.com', password: 'Secreta123' } });
            expect(body.data.login).toMatchObject({
                tokenType: 'Bearer',
                user: { username: 'admin', email: 'admin@test.com', role: 'ADMIN' },
            });
            expect(body.data.login.accessToken).toEqual(expect.any(String));
        });

        it('con credenciales erróneas responde 401', async () => {
            const { body } = await gql(LOGIN, { input: { email: 'admin@test.com', password: 'Incorrecta1' } });
            expect(originalError(body)).toMatchObject({ statusCode: 401, message: 'Credenciales inválidas' });
        });

        it('valida la entrada con las mismas reglas que REST (400)', async () => {
            const { body } = await gql(LOGIN, { input: { email: 'no-es-correo', password: 'x' } });
            expect(originalError(body)).toMatchObject({
                statusCode: 400,
                message: ['El correo electrónico suministrado no es válido'],
            });
        });
    });

    describe('me', () => {
        it('sin token o con token inválido responde 401', async () => {
            expect(originalError((await gql(ME)).body)).toMatchObject({ statusCode: 401 });
            expect(originalError((await gql(ME, undefined, 'no.es.jwt')).body)).toMatchObject({ statusCode: 401 });
        });

        it('devuelve el perfil con su rol y permisos', async () => {
            const token = await login('admin@test.com', 'Secreta123');
            const { body } = await gql(ME, undefined, token);
            expect(body.data.me).toMatchObject({
                username: 'admin',
                role: { name: 'ADMIN', rolePermissions: [{ permission: { name: 'users:manage' } }] },
            });
        });

        it('no permite pedir passwordHash', async () => {
            const token = await login('admin@test.com', 'Secreta123');
            const { body } = await gql(`{ me { passwordHash } }`, undefined, token);
            expect(body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
        });
    });

    describe('register', () => {
        it('crea un usuario con rol USER', async () => {
            const { body } = await gql(REGISTER, {
                input: { username: 'nuevo_1', email: 'nuevo@test.com', password: 'Secreta123' },
            });
            expect(body.data.register).toMatchObject({ username: 'nuevo_1', role: { name: 'USER' } });
        });

        it('rechaza una contraseña débil (400)', async () => {
            const { body } = await gql(REGISTER, {
                input: { username: 'debil_1', email: 'debil@test.com', password: 'abc' },
            });
            expect(originalError(body)).toMatchObject({ statusCode: 400 });
        });

        it('con correo repetido responde 409', async () => {
            const { body } = await gql(REGISTER, {
                input: { username: 'otro_1', email: 'nuevo@test.com', password: 'Secreta123' },
            });
            expect(originalError(body)).toMatchObject({ statusCode: 409 });
        });
    });

    describe('logout', () => {
        it('revoca el token: deja de ser válido aunque no haya expirado', async () => {
            const token = await login('admin@test.com', 'Secreta123');
            expect((await gql(`mutation { logout }`, undefined, token)).body.data.logout).toBe(true);
            expect(originalError((await gql(ME, undefined, token)).body)).toMatchObject({ statusCode: 401 });
        });
    });
});
