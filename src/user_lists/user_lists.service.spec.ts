import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserListsService } from './user_lists.service.js';
import { ListVisibility, UserList } from './entities/user_list.entity.js';
import { ListMediaApprovalStatus, ListsContext } from './lists-context.js';

describe('UserListsService', () => {
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const listId = '33333333-3333-4333-8333-333333333333';
  const mediaItemId = '44444444-4444-4444-8444-444444444444';

  function createService(lists: UserList[] = []) {
    const repository = {
      create: vi.fn((value: Partial<UserList>) => Object.assign(new UserList(), value)),
      findOne: vi.fn(async ({ where }: { where: Partial<UserList> }) =>
        lists.find((list) => Object.entries(where).every(([key, value]) => list[key as keyof UserList] === value)) ?? null),
      find: vi.fn(async () => lists),
      findAndCount: vi.fn(async () => [lists.filter((list) => list.visibility === ListVisibility.PUBLIC), lists.length] as const),
      save: vi.fn(async (list: UserList) => list),
      remove: vi.fn(async (list: UserList) => list),
    };
    const context: ListsContext = {
      findMediaItem: vi.fn(async () => ({ id: mediaItemId, approvalStatus: ListMediaApprovalStatus.APPROVED })),
      findOwnerUsername: vi.fn(async () => 'owner'),
    };
    return {
      service: new UserListsService(repository as never, undefined, context),
      repository,
    };
  }

  it('creates a private list by default', async () => {
    const { service } = createService();
    const list = await service.create(ownerId, { name: 'Favorites' });
    expect(list.visibility).toBe(ListVisibility.PRIVATE);
    expect(list.itemIds).toEqual([]);
  });

  it('rejects duplicate names and non-owner mutations', async () => {
    const existing = Object.assign(new UserList(), { id: listId, ownerId, name: 'Favorites', itemIds: [] });
    const { service } = createService([existing]);
    await expect(service.create(ownerId, { name: 'Favorites' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update(otherUserId, listId, { name: 'Changed' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects private access for non-owners and duplicate items', async () => {
    const existing = Object.assign(new UserList(), {
      id: listId,
      ownerId,
      name: 'Favorites',
      visibility: ListVisibility.PRIVATE,
      itemIds: [mediaItemId],
    });
    const { service } = createService([existing]);
    await expect(service.findOne(otherUserId, listId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.addItem(ownerId, listId, { mediaItemId })).rejects.toBeInstanceOf(ConflictException);
  });
});
