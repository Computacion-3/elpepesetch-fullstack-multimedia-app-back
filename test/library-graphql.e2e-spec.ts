import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';

describe('Library GraphQL (e2e)', () => {
    let app: INestApplication;
    let db: DataSource;
    let token: string;
    const mediaId = '11111111-1111-4111-8111-111111111111';

    const gql = (query: string, variables?: object, bearer = token) => {
        const call = request(app.getHttpServer()).post('/graphql');
        if (bearer) call.set('Authorization', `Bearer ${bearer}`);
        return call.send({ query, variables });
    };
    const login = async () =>
        (await request(app.getHttpServer()).post('/auth/login').send({ email: 'library@test.com', password: 'Secreta123' }))
            .body.accessToken as string;

    beforeAll(async () => {
        if (!/test/i.test(process.env.POSTGRES_DB ?? '')) {
            throw new Error('Los e2e solo se ejecutan si POSTGRES_DB contiene "test".');
        }
        const fixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = fixture.createNestApplication();
        await app.init();
        db = app.get(DataSource);
        await db.query('TRUNCATE users, roles, revoked_tokens RESTART IDENTITY CASCADE');
        await db.query(`INSERT INTO roles (name, description) VALUES ('USER', 'user')`);
        const hash = bcrypt.hashSync('Secreta123', 4);
        await db.query(
            `INSERT INTO users (username, email, password_hash, role_id) VALUES ('library', 'library@test.com', $1, 1), ('other', 'other@test.com', $1, 1)`,
            [hash],
        );
        await db.query(
            `INSERT INTO media_items (id, title, type, release_year, creator, created_by_id, approval_status)
             VALUES ($1, 'Test Game', 'GAME', 2025, 'Studio', 1, 'APPROVED')`,
            [mediaId],
        );
        token = await login();
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    it('requires JWT for library queries and mutations', async () => {
        expect((await gql('{ myLibrary { meta { total } } }', undefined, '')).body.errors[0].extensions).toMatchObject({
            code: 'UNAUTHENTICATED',
            status: 401,
        });
        expect(
            (await gql('mutation($input: AddLibraryEntryInput!) { addToLibrary(input: $input) { id } }', {
                input: { mediaItemId: mediaId },
            }, '')).body.errors[0].extensions,
        ).toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });
        const invalidTokenResponse = await gql('{ myLibrary { meta { total } } }', undefined, 'invalid.jwt.token');
        expect(invalidTokenResponse.body.errors[0].extensions)
            .toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });
    });

    it('supports create, filtered query, update, duplicate errors, and removal through the shared service', async () => {
        const add = await gql(
            'mutation($input: AddLibraryEntryInput!) { addToLibrary(input: $input) { id status mediaItem { id title } } }',
            { input: { mediaItemId: mediaId } },
        );
        expect(add.body.data.addToLibrary).toMatchObject({ status: 'PENDING', mediaItem: { id: mediaId, title: 'Test Game' } });
        const entryId = add.body.data.addToLibrary.id as string;

        const duplicate = await gql(
            'mutation($input: AddLibraryEntryInput!) { addToLibrary(input: $input) { id } }',
            { input: { mediaItemId: mediaId } },
        );
        expect(duplicate.body.errors[0].extensions).toMatchObject({ code: 'CONFLICT', status: 409 });
        await request(app.getHttpServer())
            .post('/library')
            .set('Authorization', `Bearer ${token}`)
            .send({ mediaItemId: mediaId })
            .expect(409);
        const [activityCount] = await db.query(
            `SELECT COUNT(*)::integer AS count FROM activity_logs WHERE user_id = 1 AND action = 'ENTRY_ADDED'`,
        );
        const [notificationCount] = await db.query(`SELECT COUNT(*)::integer AS count FROM notifications WHERE user_id = 1`);
        expect(activityCount.count).toBe(1);
        expect(notificationCount.count).toBe(0);

        const invalid = await gql(
            'mutation($id: ID!, $input: UpdateLibraryEntryInput!) { updateLibraryEntry(id: $id, input: $input) { id } }',
            { id: entryId, input: { progress: -1 } },
        );
        expect(invalid.body.errors[0].extensions).toMatchObject({ code: 'BAD_REQUEST', status: 400 });

        const updated = await gql(
            'mutation($id: ID!, $input: UpdateLibraryEntryInput!) { updateLibraryEntry(id: $id, input: $input) { status progress } }',
            { id: entryId, input: { progress: 12 } },
        );
        expect(updated.body.errors).toBeUndefined();
        expect(updated.body.data.updateLibraryEntry).toMatchObject({ status: 'IN_PROGRESS', progress: 12 });

        const pendingRating = await gql(
            'mutation($id: ID!, $input: UpdateLibraryEntryInput!) { updateLibraryEntry(id: $id, input: $input) { id } }',
            { id: entryId, input: { status: 'PENDING', rating: 8 } },
        );
        expect(pendingRating.body.errors[0].extensions).toMatchObject({ code: 'BAD_REQUEST', status: 400 });

        const page = await gql('{ myLibrary(filter: { isFavorite: false }) { data { id } meta { total page limit totalPages } } }');
        expect(page.body.data.myLibrary).toMatchObject({ data: [{ id: entryId }], meta: { total: 1, page: 1, limit: 10 } });
        const restPage = await request(app.getHttpServer()).get('/library').set('Authorization', `Bearer ${token}`);
        expect(restPage.body.data[0]).toMatchObject(page.body.data.myLibrary.data[0]);

        const removed = await gql('mutation($id: ID!) { removeLibraryEntry(id: $id) }', { id: entryId });
        expect(removed.body.data.removeLibraryEntry).toBe(true);
    });

    it('blocks another user from reading or editing an entry', async () => {
        await db.query(
            `INSERT INTO library_entries (user_id, media_item_id, status, progress, is_favorite) VALUES (2, $1, 'PENDING', 0, false)`,
            [mediaId],
        );
        const rows = await db.query(`SELECT id FROM library_entries WHERE user_id = 2`);
        const response = await gql('query($id: ID!) { libraryEntry(id: $id) { id } }', { id: rows[0].id });
        expect(response.body.errors[0].extensions).toMatchObject({ code: 'FORBIDDEN', status: 403 });
        const update = await gql(
            'mutation($id: ID!, $input: UpdateLibraryEntryInput!) { updateLibraryEntry(id: $id, input: $input) { id } }',
            { id: rows[0].id, input: { isFavorite: true } },
        );
        expect(update.body.errors[0].extensions).toMatchObject({ code: 'FORBIDDEN', status: 403 });
    });
});
