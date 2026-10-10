import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { setupSwagger } from '../src/common/swagger/setup-swagger.js';
import { User } from '../src/auth/entities/user.entity.js';
import { MediaItem } from '../src/library-elements/entities/media-item.entity.js';
import { ApprovalStatus, MediaType } from '../src/library-elements/enums/library.enums.js';

describe('Library, Lists and Activity security (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let userAToken: string;
    let userBToken: string;
    let userAId: number;
    let userBId: number;
    let userBListId: string;
    let mediaItemId: string;
    let libraryEntryId: string;

    const login = async (email: string) =>
        (await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'Secreta123' }).expect(200))
            .body.accessToken as string;

    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

    beforeAll(async () => {
        if (!/test/i.test(process.env.POSTGRES_DB ?? '')) {
            throw new Error('Los e2e solo se ejecutan si POSTGRES_DB contiene "test".');
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleFixture.createNestApplication();
        setupSwagger(app);
        await app.init();
        dataSource = app.get(DataSource);

        await dataSource.query(
            `TRUNCATE users, roles, permissions, role_permissions, revoked_tokens RESTART IDENTITY CASCADE`,
        );
        await dataSource.query(`INSERT INTO roles (name, description) VALUES ('USER', 'user'), ('ADMIN', 'admin')`);

        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'library_user_a', email: 'library-a@test.com', password: 'Secreta123' })
            .expect(201);
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username: 'library_user_b', email: 'library-b@test.com', password: 'Secreta123' })
            .expect(201);

        const userRepository = dataSource.getRepository(User);
        userAId = (await userRepository.findOneByOrFail({ email: 'library-a@test.com' })).id;
        userBId = (await userRepository.findOneByOrFail({ email: 'library-b@test.com' })).id;
        userAToken = await login('library-a@test.com');
        userBToken = await login('library-b@test.com');

        const mediaItem = await dataSource.getRepository(MediaItem).save({
            title: 'Security test book',
            type: MediaType.BOOK,
            description: null,
            releaseYear: 2024,
            creator: 'Security test',
            coverUrl: null,
            platform: null,
            durationMinutes: null,
            pages: 100,
            isbn: null,
            approvalStatus: ApprovalStatus.APPROVED,
            rejectionReason: null,
            averageRating: 0,
            ratingsCount: 0,
            createdBy: { id: userAId },
        });
        mediaItemId = mediaItem.id;

        await request(app.getHttpServer())
            .post('/lists')
            .set(auth(userBToken))
            .send({ name: 'User B private list' })
            .expect(201);
        userBListId = (
            await dataSource.query(`SELECT id FROM user_lists WHERE owner_id = $1 AND name = $2`, [
                userBId,
                'User B private list',
            ])
        )[0].id;

        await request(app.getHttpServer()).post('/library').set(auth(userAToken)).send({ mediaItemId }).expect(201);
        libraryEntryId = (
            await dataSource.query(`SELECT id FROM library_entries WHERE user_id = $1 AND media_item_id = $2`, [
                userAId,
                mediaItemId,
            ])
        )[0].id;
    });

    afterAll(async () => {
        await app.close();
    });

    describe('401 authentication', () => {
        const protectedRequests: Array<{ method: 'get' | 'post' | 'patch' | 'delete'; path: string }> = [
            { method: 'get', path: '/library' },
            { method: 'post', path: '/library' },
            { method: 'get', path: '/library/00000000-0000-0000-0000-000000000000' },
            { method: 'patch', path: '/library/00000000-0000-0000-0000-000000000000' },
            { method: 'delete', path: '/library/00000000-0000-0000-0000-000000000000' },
            { method: 'get', path: '/lists' },
            { method: 'get', path: '/lists/public' },
            { method: 'post', path: '/lists' },
            { method: 'get', path: '/lists/00000000-0000-0000-0000-000000000000' },
            { method: 'patch', path: '/lists/00000000-0000-0000-0000-000000000000' },
            { method: 'delete', path: '/lists/00000000-0000-0000-0000-000000000000' },
            { method: 'post', path: '/lists/00000000-0000-0000-0000-000000000000/items' },
            {
                method: 'delete',
                path: '/lists/00000000-0000-0000-0000-000000000000/items/00000000-0000-0000-0000-000000000000',
            },
            { method: 'get', path: '/activity' },
        ];

        it.each(protectedRequests)('$method $path rejects missing authentication', async ({ method, path }) => {
            await request(app.getHttpServer())[method](path).expect(401);
        });
    });

    describe('ownership', () => {
        it('rejects PATCH by a non-owner with 403', () =>
            request(app.getHttpServer())
                .patch(`/lists/${userBListId}`)
                .set(auth(userAToken))
                .send({ name: 'Hijacked list' })
                .expect(403));

        it('rejects DELETE by a non-owner with 403', () =>
            request(app.getHttpServer()).delete(`/lists/${userBListId}`).set(auth(userAToken)).expect(403));

        it('rejects adding an item by a non-owner with 403', () =>
            request(app.getHttpServer())
                .post(`/lists/${userBListId}/items`)
                .set(auth(userAToken))
                .send({ mediaItemId })
                .expect(403));

        it('rejects removing an item by a non-owner with 403', () =>
            request(app.getHttpServer())
                .delete(`/lists/${userBListId}/items/${mediaItemId}`)
                .set(auth(userAToken))
                .expect(403));

        it('hides another user library entry with 404', async () => {
            await request(app.getHttpServer()).get(`/library/${libraryEntryId}`).set(auth(userBToken)).expect(404);
            await request(app.getHttpServer())
                .patch(`/library/${libraryEntryId}`)
                .set(auth(userBToken))
                .send({ isFavorite: true })
                .expect(404);
            await request(app.getHttpServer()).delete(`/library/${libraryEntryId}`).set(auth(userBToken)).expect(404);
        });
    });

    it('isolates activity history between authenticated users and returns pagination metadata', async () => {
        const userAActivity = await request(app.getHttpServer()).get('/activity').set(auth(userAToken)).expect(200);
        const userBActivity = await request(app.getHttpServer()).get('/activity').set(auth(userBToken)).expect(200);

        expect(userAActivity.body.meta).toMatchObject({ page: 1, limit: 10 });
        expect(userBActivity.body.meta).toMatchObject({ page: 1, limit: 10 });
        expect(userAActivity.body.data.map((entry: { action: string }) => entry.action)).toContain('ENTRY_ADDED');
        expect(userBActivity.body.data.map((entry: { action: string }) => entry.action)).toContain('LIST_CREATED');
        expect(userAActivity.body.data.map((entry: { action: string }) => entry.action)).not.toContain('LIST_CREATED');
        expect(userBActivity.body.data.map((entry: { action: string }) => entry.action)).not.toContain('ENTRY_ADDED');
        expect(userAActivity.body.meta.total).toBeGreaterThan(0);
        expect(userBActivity.body.meta.total).toBeGreaterThan(0);
        const dates = userAActivity.body.data.map((entry: { createdAt: string }) => Date.parse(entry.createdAt));
        expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });
});
