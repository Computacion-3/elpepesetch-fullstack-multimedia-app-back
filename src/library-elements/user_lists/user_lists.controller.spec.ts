import { Mocked } from 'vitest';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { ListVisibility } from '../enums/library.enums.js';
import { UserListsController } from './user_lists.controller.js';
import { UserListsService } from './user_lists.service.js';

describe('UserListsController', () => {
    let controller: UserListsController;
    let service: Mocked<
        Pick<
            UserListsService,
            'create' | 'findAll' | 'findPublic' | 'findOne' | 'update' | 'remove' | 'addItem' | 'removeItem'
        >
    >;

    // Usuario resuelto por JwtStrategy: el controlador solo debe usar su id, nunca datos del body
    const user: AuthenticatedUser = {
        id: 7,
        email: 'pepe@example.com',
        username: 'pepe',
        role: 'USER',
        permissions: [],
        jti: 'token-1',
        tokenExp: 0,
    };
    const listId = '11111111-1111-4111-8111-111111111111';
    const mediaItemId = '22222222-2222-4222-8222-222222222222';
    const result = { id: listId } as never;

    beforeEach(() => {
        service = {
            create: vi.fn().mockResolvedValue(result),
            findAll: vi.fn().mockResolvedValue([result]),
            findPublic: vi.fn().mockResolvedValue({ data: [], meta: {} }),
            findOne: vi.fn().mockResolvedValue(result),
            update: vi.fn().mockResolvedValue(result),
            remove: vi.fn().mockResolvedValue(undefined),
            addItem: vi.fn().mockResolvedValue(result),
            removeItem: vi.fn().mockResolvedValue(result),
        };
        controller = new UserListsController(service as unknown as UserListsService);
    });

    it('POST /lists crea la lista a nombre del usuario autenticado', async () => {
        const dto = { name: 'Favoritos', visibility: ListVisibility.PUBLIC };

        await expect(controller.create(user, dto)).resolves.toBe(result);
        expect(service.create).toHaveBeenCalledWith(7, dto);
    });

    it('GET /lists devuelve solo las listas propias', async () => {
        await expect(controller.findAll(user)).resolves.toEqual([result]);
        expect(service.findAll).toHaveBeenCalledWith(7);
    });

    it('GET /lists/public pasa la paginación y el usuario que consulta', async () => {
        const query = { page: 2, limit: 5 };

        await controller.findPublic(user, query);

        expect(service.findPublic).toHaveBeenCalledWith(7, query);
    });

    it('GET /lists/:id consulta como el usuario autenticado', async () => {
        await expect(controller.findOne(user, listId)).resolves.toBe(result);
        expect(service.findOne).toHaveBeenCalledWith(7, listId);
    });

    it('PATCH /lists/:id edita como dueño', async () => {
        const dto = { description: 'Nueva' };

        await controller.update(user, listId, dto);

        expect(service.update).toHaveBeenCalledWith(7, listId, dto);
    });

    it('DELETE /lists/:id elimina como dueño', async () => {
        await expect(controller.remove(user, listId)).resolves.toBeUndefined();
        expect(service.remove).toHaveBeenCalledWith(7, listId);
    });

    it('POST /lists/:id/items agrega el elemento indicado', async () => {
        await controller.addItem(user, listId, { mediaItemId });
        expect(service.addItem).toHaveBeenCalledWith(7, listId, { mediaItemId });
    });

    it('DELETE /lists/:id/items/:mediaItemId quita el elemento indicado', async () => {
        await controller.removeItem(user, listId, mediaItemId);
        expect(service.removeItem).toHaveBeenCalledWith(7, listId, mediaItemId);
    });

    it('propaga los errores del servicio sin transformarlos', async () => {
        const failure = new Error('forbidden');
        service.update.mockRejectedValue(failure);

        await expect(controller.update(user, listId, {})).rejects.toBe(failure);
    });
});
