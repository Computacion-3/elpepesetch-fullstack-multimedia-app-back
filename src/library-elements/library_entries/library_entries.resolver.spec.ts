import { LibraryEntriesResolver } from './library_entries.resolver.js';

describe('LibraryEntriesResolver', () => {
    const user = { id: 42 } as any;
    const service = {
        findAll: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    };
    const resolver = new LibraryEntriesResolver(service as any);

    beforeEach(() => vi.clearAllMocks());

    it('delegates the library query using the authenticated user and REST filter DTO', async () => {
        const page = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        service.findAll.mockResolvedValue(page);
        await expect(resolver.myLibrary(user, { isFavorite: true } as any)).resolves.toBe(page);
        expect(service.findAll).toHaveBeenCalledWith(42, expect.objectContaining({ isFavorite: true, page: 1 }));
    });

    it('delegates detail, add, update, and removal without implementing library rules', async () => {
        const entry = { id: 'entry' };
        service.findOne.mockResolvedValue(entry);
        service.create.mockResolvedValue(entry);
        service.update.mockResolvedValue(entry);
        service.remove.mockResolvedValue(undefined);

        await expect(resolver.libraryEntry(user, 'entry')).resolves.toBe(entry);
        await expect(resolver.addToLibrary(user, { mediaItemId: 'media' } as any)).resolves.toBe(entry);
        await expect(resolver.updateLibraryEntry(user, 'entry', { progress: 2 } as any)).resolves.toBe(entry);
        await expect(resolver.removeLibraryEntry(user, 'entry')).resolves.toBe(true);
        expect(service.findOne).toHaveBeenCalledWith(42, 'entry');
        expect(service.create).toHaveBeenCalledWith(42, expect.objectContaining({ mediaItemId: 'media' }));
        expect(service.update).toHaveBeenCalledWith(42, 'entry', expect.objectContaining({ progress: 2 }));
        expect(service.remove).toHaveBeenCalledWith(42, 'entry');
    });
});
