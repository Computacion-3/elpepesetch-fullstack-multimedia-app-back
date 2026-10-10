import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserListsService } from './user_lists.service.js';
import { UserList } from '../entities/user_list.entity.js';
import { MediaItem } from '../entities/media-item.entity.js';
import { ApprovalStatus, ListVisibility, MediaType } from '../enums/library.enums.js';

describe('UserListsService', () => {
  const mediaItem = Object.assign(new MediaItem(), { id: '44444444-4444-4444-8444-444444444444', approvalStatus: ApprovalStatus.APPROVED, type: MediaType.BOOK });
  function createService(lists: UserList[] = [], media = mediaItem) {
    const repository = {
      create: vi.fn((value: Partial<UserList>) => Object.assign(new UserList(), value)),
      findOne: vi.fn(async ({ where }: any) => lists.find((list) =>
        (where.id && list.id === where.id) ||
        (where.owner?.id && list.owner?.id === where.owner.id && list.name === where.name)) ?? null),
      find: vi.fn(async () => lists),
      findAndCount: vi.fn(async () => [lists, lists.length] as const),
      save: vi.fn(async (list: UserList) => list),
      remove: vi.fn(async (list: UserList) => list),
    };
    const mediaRepository = { findOne: vi.fn(async () => media) };
    const activity = { logActivity: vi.fn(async () => undefined) };
    return { service: new UserListsService(repository as never, mediaRepository as never, activity as never) };
  }

  it('creates a private list by default with an owner relation', async () => {
    const { service } = createService();
    const list = await service.create(7, { name: 'Favorites' });
    expect(list.visibility).toBe(ListVisibility.PRIVATE);
    expect(list.owner).toEqual({ id: 7 });
    expect(list.items).toEqual([]);
  });

  it('rejects duplicate names and non-owner mutations', async () => {
    const existing = Object.assign(new UserList(), { id: 'list-1', owner: { id: 7 }, name: 'Favorites', items: [] });
    const { service } = createService([existing]);
    await expect(service.create(7, { name: 'Favorites' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update(8, 'list-1', { name: 'Changed' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects private access and duplicate items', async () => {
    const existing = Object.assign(new UserList(), { id: 'list-1', owner: { id: 7 }, name: 'Favorites', visibility: ListVisibility.PRIVATE, items: [mediaItem] });
    const { service } = createService([existing]);
    await expect(service.findOne(8, 'list-1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.addItem(7, 'list-1', { mediaItemId: mediaItem.id })).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows public access to other users and rejects unapproved items', async () => {
    const publicList = Object.assign(new UserList(), {
      id: 'public-list',
      owner: { id: 8, username: 'owner' },
      name: 'Public',
      visibility: ListVisibility.PUBLIC,
      items: [],
    });
    const { service } = createService([publicList]);
    const result = await service.findOne(7, publicList.id);
    expect(result).toBe(publicList);

    const rejected = Object.assign(new MediaItem(), mediaItem, { approvalStatus: ApprovalStatus.PENDING });
    const rejectedService = createService([Object.assign(new UserList(), {
      id: 'list-2', owner: { id: 7 }, name: 'List', items: [],
    })], rejected).service;
    await expect(rejectedService.addItem(7, 'list-2', { mediaItemId: rejected.id })).rejects.toThrow();
  });

  it('removes an item from an owned list', async () => {
    const list = Object.assign(new UserList(), {
      id: 'list-3', owner: { id: 7 }, name: 'List', items: [mediaItem],
    });
    const { service } = createService([list]);
    await service.removeItem(7, list.id, mediaItem.id);
    expect(list.items).toEqual([]);
  });
});
