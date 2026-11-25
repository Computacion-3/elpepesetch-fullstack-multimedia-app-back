import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ListVisibility } from '../enums/library.enums.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { ListQueryDto } from './dto/list-query.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';
import { UserListsResolver } from './user_lists.resolver.js';
import { UserListsService } from './user_lists.service.js';

describe('UserListsResolver', () => {
    const user = { id: 7 } as AuthenticatedUser;
    const listId = '11111111-1111-4111-8111-111111111111';
    const mediaItemId = '22222222-2222-4222-8222-222222222222';
    const list = { id: listId } as never;
    let service: Record<string, ReturnType<typeof vi.fn>>;
    let resolver: UserListsResolver;

    beforeEach(() => {
        service = {
            findAll: vi.fn().mockResolvedValue([list]),
            findPublic: vi.fn().mockResolvedValue({ data: [list], meta: {} }),
            findOne: vi.fn().mockResolvedValue(list),
            create: vi.fn().mockResolvedValue(list),
            update: vi.fn().mockResolvedValue(list),
            remove: vi.fn().mockResolvedValue(undefined),
            addItem: vi.fn().mockResolvedValue(list),
            removeItem: vi.fn().mockResolvedValue(list),
        };
        resolver = new UserListsResolver(service as unknown as UserListsService);
    });

    it('delegates own and public list queries with the authenticated user and normalized filter', async () => {
        await expect(resolver.myLists(user)).resolves.toEqual([list]);
        expect(service.findAll).toHaveBeenCalledWith(user.id, true);

        const result = await resolver.publicLists(user, { page: 2, limit: 5 });
        expect(result.data).toEqual([list]);
        expect(service.findPublic).toHaveBeenCalledWith(user.id, expect.any(ListQueryDto), true);
        expect(service.findPublic.mock.calls[0][1]).toMatchObject({ page: 2, limit: 5 });
    });

    it('delegates visible-list lookup to the service so it retains privacy rules', async () => {
        await expect(resolver.userList(user, listId)).resolves.toBe(list);
        expect(service.findOne).toHaveBeenCalledWith(user.id, listId, true);
    });

    it('converts create and update inputs to the existing DTOs', async () => {
        await resolver.createUserList(user, { name: 'Public', visibility: ListVisibility.PUBLIC });
        expect(service.create).toHaveBeenCalledWith(user.id, expect.any(CreateUserListDto));
        expect(service.create.mock.calls[0][1]).toMatchObject({ name: 'Public', visibility: ListVisibility.PUBLIC });

        await resolver.updateUserList(user, listId, { description: 'Changed' });
        expect(service.update).toHaveBeenCalledWith(user.id, listId, expect.any(UpdateUserListDto), true);
        expect(service.update.mock.calls[0][2]).toMatchObject({ description: 'Changed' });
    });

    it('delegates delete and list-item mutations without changing service errors', async () => {
        await expect(resolver.deleteUserList(user, listId)).resolves.toBe(true);
        expect(service.remove).toHaveBeenCalledWith(user.id, listId);

        await resolver.addItemToList(user, listId, { mediaItemId });
        expect(service.addItem).toHaveBeenCalledWith(user.id, listId, expect.any(AddListItemDto), true);

        await expect(resolver.removeItemFromList(user, listId, mediaItemId)).resolves.toBe(true);
        expect(service.removeItem).toHaveBeenCalledWith(user.id, listId, mediaItemId);

        const failure = new Error('not owner');
        service.removeItem.mockRejectedValue(failure);
        await expect(resolver.removeItemFromList(user, listId, mediaItemId)).rejects.toBe(failure);
    });
});
