import type { AddressInfo } from 'node:net';

import { Test, TestingModule } from '@nestjs/testing';
import { Inject, INestApplication } from '@nestjs/common';
import {
    ConnectedSocket,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppModule } from './../src/app.module.js';
import { AuthModule } from './../src/auth/auth.module.js';
import { AuthService } from './../src/auth/auth.service.js';
import { createSocketAuthMiddleware, getSocketUser } from './../src/auth/socket/socket-auth.middleware.js';

/**
 * Gateway mínimo SOLO para esta prueba: muestra cómo debe usar el middleware el gateway real.
 * `whoami` devuelve el usuario que el middleware dejó en socket.data.user.
 */
@WebSocketGateway()
class ProbeGateway implements OnGatewayInit {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    afterInit(server: Server) {
        server.use(createSocketAuthMiddleware(this.authService));
    }

    @SubscribeMessage('whoami')
    whoami(@ConnectedSocket() client: Socket) {
        return { user: getSocketUser(client), rooms: [...client.rooms] };
    }
}

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

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule, AuthModule],
            providers: [ProbeGateway],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.listen(0);
        baseUrl = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;

        const db = app.get(DataSource);
        await db.query(`TRUNCATE users, role_permissions, permissions, roles, revoked_tokens RESTART IDENTITY CASCADE`);
        await db.query(`INSERT INTO roles (name, description) VALUES ('USER','u'),('ADMIN','a')`);
        await db.query(`INSERT INTO permissions (name, description) VALUES ('users:manage','m')`);
        await db.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (2, 1)`);
        const hash = bcrypt.hashSync('Secreta123', 4);
        await db.query(
            `INSERT INTO users (username, email, password_hash, role_id) VALUES
                ('admin','admin@test.com',$1,2), ('pepe','pepe@test.com',$1,1)`,
            [hash],
        );
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
        it('con un ticket válido conecta y el gateway conoce al usuario, sus permisos y su sala', async () => {
            const client = await connect(await socketTicket(await login('admin@test.com', 'Secreta123')));

            const answer = await client.emitWithAck('whoami');

            expect(answer.user).toEqual({
                id: 1,
                email: 'admin@test.com',
                username: 'admin',
                role: 'ADMIN',
                permissions: ['users:manage'],
            });
            expect(answer.rooms).toContain('user:1');
        });

        it('el mismo ticket no se puede usar dos veces', async () => {
            const ticket = await socketTicket(await login('admin@test.com', 'Secreta123'));
            await connect(ticket);

            await expect(connect(ticket)).rejects.toThrow('El ticket del socket ya fue usado');
        });

        it('sin ticket se rechaza la conexión', async () => {
            await expect(connect()).rejects.toThrow('Falta el ticket del socket');
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
    });
});
