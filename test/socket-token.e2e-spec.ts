import type { AddressInfo } from 'node:net';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Server } from 'socket.io';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './../src/app.module.js';
import { RealtimeGateway } from './../src/realtime/realtime.gateway.js';

// Requiere PostgreSQL (variables POSTGRES_* / DB_HOST) y JWT_SECRET en el entorno.
describe('Ticket del WebSocket (e2e)', () => {
    let app: INestApplication;
    let baseUrl: string;
    const clients: ClientSocket[] = [];

    const login = async (email: string, password: string) =>
        (await request(app.getHttpServer()).post('/auth/login').send({ email, password })).body.accessToken as string;

    const socketTicket = async (sessionToken: string) =>
        (await request(app.getHttpServer()).post('/auth/socket-token').set('Authorization', `Bearer ${sessionToken}`))
            .body.token as string;

    /** Abre una conexión; resuelve al conectar o rechaza con el motivo de `connect_error`. */
    const connect = (token?: string) =>
        new Promise<ClientSocket>((resolve, reject) => {
            const client = io(baseUrl, {
                auth: token === undefined ? {} : { token },
                transports: ['websocket'],
                reconnection: false,
                forceNew: true,
            });
            clients.push(client);
            client.once('connect', () => resolve(client));
            client.once('connect_error', (err) => reject(err));
        });

    beforeAll(async () => {
        // Este suite hace TRUNCATE de tablas: nunca debe correr contra una base de datos de desarrollo o producción
        if (!/test/i.test(process.env.POSTGRES_DB ?? '')) {
            throw new Error('Los e2e solo se ejecutan si POSTGRES_DB contiene "test" (se vacían las tablas).');
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleFixture.createNestApplication();
        await app.listen(0);
        baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;

        const db = app.get(DataSource);
        await db.query(`TRUNCATE users, role_permissions, permissions, roles, revoked_tokens, genres RESTART IDENTITY CASCADE`);
        await db.query(`INSERT INTO roles (name, description) VALUES ('USER','u'),('ADMIN','a'),('MODERATOR','m')`);
        await db.query(`INSERT INTO permissions (name, description) VALUES ('users:manage','m'),('catalog:create','c'),('catalog:moderate','m')`);
        await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (2, 1), (1, 2), (3, 3), (2, 3)`);
        const hash = bcrypt.hashSync('Secreta123', 4);
        await db.query(
            `INSERT INTO users (username, email, password_hash, role_id) VALUES
                ('admin','admin@test.com',$1,2), ('pepe','pepe@test.com',$1,1), ('moderator','moderator@test.com',$1,3)`,
            [hash],
        );
        await db.query(`INSERT INTO genres (id, name) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Test')`);
    });

    afterEach(() => {
        for (const client of clients.splice(0)) client.disconnect();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    describe('emisión', () => {
        it('POST /auth/socket-token sin sesión responde 401', async () => {
            await request(app.getHttpServer()).post('/auth/socket-token').expect(401);
        });

        it('POST /auth/socket-token devuelve un ticket de 60 s', async () => {
            const session = await login('admin@test.com', 'Secreta123');
            const { body } = await request(app.getHttpServer())
                .post('/auth/socket-token')
                .set('Authorization', `Bearer ${session}`)
                .expect(200);
            expect(body).toEqual({ token: expect.any(String), expiresIn: 60 });
            expect(body.token).not.toBe(session);
        });

        it('la mutation socketToken de GraphQL devuelve lo mismo', async () => {
            const session = await login('admin@test.com', 'Secreta123');
            const { body } = await request(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${session}`)
                .send({ query: 'mutation { socketToken { token expiresIn } }' });
            expect(body.data.socketToken).toEqual({ token: expect.any(String), expiresIn: 60 });
        });

        it('el ticket no sirve como Bearer en HTTP', async () => {
            const ticket = await socketTicket(await login('admin@test.com', 'Secreta123'));
            await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${ticket}`).expect(401);
        });
    });

    describe('handshake de Socket.IO', () => {
        it('conecta y el servidor asigna las salas según el rol vigente', async () => {
            const admin = await connect(await socketTicket(await login('admin@test.com', 'Secreta123')));
            const user = await connect(await socketTicket(await login('pepe@test.com', 'Secreta123')));
            const moderator = await connect(await socketTicket(await login('moderator@test.com', 'Secreta123')));
            const server = (app.get(RealtimeGateway) as unknown as { server: Server }).server;
            const adminSockets = await server.in(admin.id!).fetchSockets();
            const userSockets = await server.in(user.id!).fetchSockets();
            const moderatorSockets = await server.in(moderator.id!).fetchSockets();
            expect(adminSockets[0]?.rooms).toContain('user:1');
            expect(adminSockets[0]?.rooms).toContain('moderators');
            expect(userSockets[0]?.rooms).toContain('user:2');
            expect(userSockets[0]?.rooms).not.toContain('moderators');
            expect(moderatorSockets[0]?.rooms).toContain('moderators');
        });

        it('notifica al creador correcto después de moderar y persiste el aviso', async () => {
            const creatorToken = await login('pepe@test.com', 'Secreta123');
            const creator = await connect(await socketTicket(creatorToken));
            const moderator = await connect(await socketTicket(await login('moderator@test.com', 'Secreta123')));
            const moderation = new Promise<Record<string, unknown>>((resolve) => creator.once('media.moderated', resolve));
            const queue = new Promise<Record<string, unknown>>((resolve) => moderator.once('moderation.queue.changed', resolve));
            const created = await request(app.getHttpServer())
                .post('/media')
                .set('Authorization', `Bearer ${creatorToken}`)
                .send({ title: 'Realtime test', type: 'GAME', releaseYear: 2025, creator: 'Studio', genreIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'] })
                .expect(201);
            expect(await queue).toMatchObject({ kind: 'MEDIA', pendingMedia: 1, openReports: 0 });
            await request(app.getHttpServer())
                .patch(`/media/${created.body.id}/approval`)
                .set('Authorization', `Bearer ${await login('moderator@test.com', 'Secreta123')}`)
                .send({ approvalStatus: 'REJECTED', rejectionReason: 'Duplicado' })
                .expect(200);
            expect(await moderation).toEqual({
                mediaItemId: created.body.id,
                title: 'Realtime test',
                approvalStatus: 'REJECTED',
                rejectionReason: 'Duplicado',
            });
            const notifications = await request(app.getHttpServer())
                .get('/notifications')
                .set('Authorization', `Bearer ${creatorToken}`)
                .expect(200);
            expect(notifications.body.data).toHaveLength(1);
            expect(notifications.body.data[0]).toMatchObject({ type: 'MEDIA_MODERATED', payload: { mediaItemId: created.body.id } });
        });

        it('el mismo ticket no se puede usar dos veces', async () => {
            const ticket = await socketTicket(await login('admin@test.com', 'Secreta123'));
            await connect(ticket);

            await expect(connect(ticket)).rejects.toThrow('El ticket del socket ya fue usado');
        });

        it('sin ticket se rechaza la conexión', async () => {
            await expect(connect()).rejects.toThrow('Falta el ticket del socket');
        });

        it('rechaza un ticket JWT inválido', async () => {
            await expect(connect('invalid.jwt.token')).rejects.toThrow();
        });

        it('rechaza un ticket cuyo token de sesión fue revocado antes del handshake', async () => {
            const session = await login('pepe@test.com', 'Secreta123');
            const ticket = await socketTicket(session);
            await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${session}`).expect(204);
            await expect(connect(ticket)).rejects.toThrow('La sesión del socket fue revocada');
        });

        it('el token de sesión no sirve como ticket', async () => {
            await expect(connect(await login('admin@test.com', 'Secreta123'))).rejects.toThrow(
                'El ticket del socket es inválido o expiró',
            );
        });

        it('si la cuenta se desactiva antes de conectar, se rechaza', async () => {
            const ticket = await socketTicket(await login('pepe@test.com', 'Secreta123'));
            await app.get(DataSource).query(`UPDATE users SET is_active = false WHERE email = 'pepe@test.com'`);

            await expect(connect(ticket)).rejects.toThrow('La cuenta está desactivada');
        });

        it('logout desconecta los sockets asociados a esa sesión', async () => {
            await app.get(DataSource).query(`UPDATE users SET is_active = true WHERE email = 'pepe@test.com'`);
            const session = await login('pepe@test.com', 'Secreta123');
            const client = await connect(await socketTicket(session));
            const closed = new Promise<void>((resolve) => client.once('disconnect', () => resolve()));
            await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${session}`).expect(204);
            await closed;
            expect(client.connected).toBe(false);
        });

        it('desactivar una cuenta emite el cierre y desconecta sus sockets', async () => {
            await app.get(DataSource).query(`UPDATE users SET is_active = true WHERE email = 'pepe@test.com'`);
            const session = await login('pepe@test.com', 'Secreta123');
            const client = await connect(await socketTicket(session));
            const deactivated = new Promise<void>((resolve) => client.once('account.deactivated', () => resolve()));
            const closed = new Promise<void>((resolve) => client.once('disconnect', () => resolve()));
            await request(app.getHttpServer())
                .patch('/users/2/status')
                .set('Authorization', `Bearer ${await login('admin@test.com', 'Secreta123')}`)
                .send({ isActive: false })
                .expect(200);
            await Promise.all([deactivated, closed]);
            expect(client.connected).toBe(false);
        });
    });
});
