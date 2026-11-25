import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/auth/entities/user.entity.js';
import { Genre } from '../src/library-elements/entities/genre.entity.js';
import { MediaItem } from '../src/library-elements/entities/media-item.entity.js';
import { ApprovalStatus, MediaType } from '../src/library-elements/enums/library.enums.js';

describe('User Lists GraphQL (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let ownerToken: string;
    let otherToken: string;
    let ownerId: number;
    let mediaId: string;
    let pendingMediaId: string;

    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
    const gql = (query: string, variables?: object, token?: string) => {
        const call = request(app.getHttpServer()).post('/graphql');
        if (token) call.set('Authorization', `Bearer ${token}`);
        return call.send({ query, variables });
    };
    const register = async (username: string, email: string) => {
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ username, email, password: 'Secreta123' })
            .expect(201);
        return (
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password: 'Secreta123' })
                .expect(200)
        ).body.accessToken as string;
    };

    beforeAll(async () => {
        if (!/test/i.test(process.env.POSTGRES_DB ?? '')) {
            throw new Error('Los e2e solo se ejecutan si POSTGRES_DB contiene "test".');
        }

        const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        dataSource = app.get(DataSource);

        await dataSource.query(`TRUNCATE users, roles, revoked_tokens, genres RESTART IDENTITY CASCADE`);
        await dataSource.query(`INSERT INTO roles (name, description) VALUES ('USER', 'user')`);
        ownerToken = await register('list_owner', 'list-owner@test.com');
        otherToken = await register('list_other', 'list-other@test.com');
        ownerId = (await dataSource.getRepository(User).findOneByOrFail({ email: 'list-owner@test.com' })).id;

        const genre = await dataSource.getRepository(Genre).save({ name: 'List test genre' });
        const mediaRepository = dataSource.getRepository(MediaItem);
        const approved = await mediaRepository.save({
            title: 'Approved list item',
            type: MediaType.BOOK,
            description: null,
            releaseYear: 2025,
            creator: 'Test studio',
            coverUrl: null,
            platform: null,
            durationMinutes: null,
            pages: 100,
            isbn: null,
            approvalStatus: ApprovalStatus.APPROVED,
            rejectionReason: null,
            averageRating: 0,
            ratingsCount: 0,
            createdBy: { id: ownerId },
            genres: [genre],
        });
        const pending = await mediaRepository.save({
            title: 'Pending list item',
            type: MediaType.BOOK,
            description: null,
            releaseYear: 2024,
            creator: 'Test studio',
            coverUrl: null,
            platform: null,
            durationMinutes: null,
            pages: 80,
            isbn: null,
            approvalStatus: ApprovalStatus.PENDING,
            rejectionReason: null,
            averageRating: 0,
            ratingsCount: 0,
            createdBy: { id: ownerId },
            genres: [genre],
        });
        mediaId = approved.id;
        pendingMediaId = pending.id;
    });

    afterAll(async () => {
        if (app) await app.close();
    });

    it('protects list queries and mutations with the shared JWT guard', async () => {
        const query = await gql('{ myLists { id } }');
        expect(query.body.errors[0].extensions).toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });

        const mutation = await gql('mutation { createUserList(input: { name: "Unauthorized" }) { id } }');
        expect(mutation.body.errors[0].extensions).toMatchObject({ code: 'UNAUTHENTICATED', status: 401 });
    });

    it('keeps private ownership, public visibility and pagination consistent with REST', async () => {
        const ownPrivate = await request(app.getHttpServer())
            .post('/lists')
            .set(auth(ownerToken))
            .send({ name: 'Private REST list' })
            .expect(201);
        const ownPublic = await gql(
            'mutation($input: CreateUserListInput!) { createUserList(input: $input) { id name visibility owner { id username } } }',
            { input: { name: 'Public GraphQL list', visibility: 'PUBLIC' } },
            ownerToken,
        );
        expect(ownPublic.body.data.createUserList).toMatchObject({
            name: 'Public GraphQL list',
            visibility: 'PUBLIC',
            owner: { id: ownerId, username: 'list_owner' },
        });

        const privateLookup = await gql('query($id: ID!) { userList(id: $id) { id } }', { id: ownPrivate.body.id }, otherToken);
        expect(privateLookup.body.errors[0].extensions).toMatchObject({ code: 'NOT_FOUND', status: 404 });
        await request(app.getHttpServer()).get(`/lists/${ownPrivate.body.id}`).set(auth(otherToken)).expect(404);

        const ownLists = await gql('query { myLists { id name visibility } }', undefined, ownerToken);
        expect(ownLists.body.data.myLists).toContainEqual(
            expect.objectContaining({ id: ownPrivate.body.id, name: 'Private REST list', visibility: 'PRIVATE' }),
        );

        const publicLookup = await gql(
            'query($id: ID!) { userList(id: $id) { id owner { id username } } }',
            { id: ownPublic.body.data.createUserList.id },
            otherToken,
        );
        expect(publicLookup.body.data.userList.owner.username).toBe('list_owner');

        const graphPage = await gql(
            'query($filter: PublicListFilterInput) { publicLists(filter: $filter) { data { id name owner { username } } meta { total page limit totalPages } } }',
            { filter: { page: 1, limit: 1 } },
            otherToken,
        );
        const restPage = await request(app.getHttpServer())
            .get('/lists/public?page=1&limit=1')
            .set(auth(otherToken))
            .expect(200);
        expect(graphPage.body.data.publicLists.meta).toEqual(restPage.body.meta);
        expect(graphPage.body.data.publicLists.data[0]).toMatchObject({
            id: restPage.body.data[0].id,
            name: restPage.body.data[0].name,
            owner: { username: restPage.body.data[0].ownerUsername },
        });
        expect((await gql('{ publicLists(filter: { page: 0 }) { meta { page } } }', undefined, otherToken)).body.errors[0].extensions)
            .toMatchObject({ code: 'BAD_REQUEST', status: 400 });
    });

    it('runs list mutations through the same service rules as REST', async () => {
        const created = await gql(
            'mutation($input: CreateUserListInput!) { createUserList(input: $input) { id name visibility owner { username } } }',
            { input: { name: 'Shared operations' } },
            ownerToken,
        );
        expect(created.body.data.createUserList).toMatchObject({
            name: 'Shared operations',
            visibility: 'PRIVATE',
            owner: { username: 'list_owner' },
        });
        const listId = created.body.data.createUserList.id as string;

        const duplicate = await request(app.getHttpServer())
            .post('/lists')
            .set(auth(ownerToken))
            .send({ name: 'Shared operations' })
            .expect(409);
        expect(duplicate.body.statusCode).toBe(409);
        const graphDuplicate = await gql(
            'mutation($input: CreateUserListInput!) { createUserList(input: $input) { id } }',
            { input: { name: 'Shared operations' } },
            ownerToken,
        );
        expect(graphDuplicate.body.errors[0].extensions).toMatchObject({ code: 'CONFLICT', status: 409 });

        const updated = await gql(
            'mutation($id: ID!, $input: UpdateUserListInput!) { updateUserList(id: $id, input: $input) { name description } }',
            { id: listId, input: { name: 'Renamed list', description: 'Shared service' } },
            ownerToken,
        );
        expect(updated.body.data.updateUserList).toEqual({ name: 'Renamed list', description: 'Shared service' });

        const forbidden = await gql(
            'mutation($id: ID!, $input: UpdateUserListInput!) { updateUserList(id: $id, input: $input) { id } }',
            { id: listId, input: { name: 'Not yours' } },
            otherToken,
        );
        expect(forbidden.body.errors[0].extensions).toMatchObject({ code: 'FORBIDDEN', status: 403 });

        const added = await gql(
            'mutation($listId: ID!, $input: AddListItemInput!) { addItemToList(listId: $listId, input: $input) { items { id title genres { name } } } }',
            { listId, input: { mediaItemId: mediaId } },
            ownerToken,
        );
        expect(added.body.data.addItemToList.items[0]).toMatchObject({
            id: mediaId,
            title: 'Approved list item',
            genres: [{ name: 'List test genre' }],
        });

        const duplicateItem = await gql(
            'mutation($listId: ID!, $input: AddListItemInput!) { addItemToList(listId: $listId, input: $input) { id } }',
            { listId, input: { mediaItemId: mediaId } },
            ownerToken,
        );
        expect(duplicateItem.body.errors[0].extensions).toMatchObject({ code: 'CONFLICT', status: 409 });

        const pendingItem = await gql(
            'mutation($listId: ID!, $input: AddListItemInput!) { addItemToList(listId: $listId, input: $input) { id } }',
            { listId, input: { mediaItemId: pendingMediaId } },
            ownerToken,
        );
        expect(pendingItem.body.errors[0].extensions).toMatchObject({ code: 'BAD_REQUEST', status: 400 });

        const removedItem = await gql(
            'mutation($listId: ID!, $mediaItemId: ID!) { removeItemFromList(listId: $listId, mediaItemId: $mediaItemId) }',
            { listId, mediaItemId: mediaId },
            ownerToken,
        );
        expect(removedItem.body.data.removeItemFromList).toBe(true);

        const deleted = await gql('mutation($id: ID!) { deleteUserList(id: $id) }', { id: listId }, ownerToken);
        expect(deleted.body.data.deleteUserList).toBe(true);
        await request(app.getHttpServer()).get(`/lists/${listId}`).set(auth(ownerToken)).expect(404);
    });
});
