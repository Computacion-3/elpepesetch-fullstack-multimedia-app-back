import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator.js';
import { GenreController } from './genre/genre.controller.js';
import { MediaItemController } from './media-item/media-item.controller.js';

/** Permisos que exige cada ruta del catálogo; las lecturas solo requieren estar autenticado. */
const reflector = new Reflector();
const required = (controller: object, handler: string): string[] | undefined =>
    reflector.get<string[] | undefined>(PERMISSIONS_KEY, (controller as Record<string, () => unknown>)[handler]);

describe('Permisos del catálogo y los géneros', () => {
    it.each([
        ['create', ['genres:manage']],
        ['update', ['genres:manage']],
        ['remove', ['genres:manage']],
        ['findAll', undefined],
        ['findOne', undefined],
    ])('GenreController.%s exige %j', (handler, permissions) => {
        expect(required(GenreController.prototype, handler)).toEqual(permissions);
    });

    it.each([
        ['create', ['catalog:create']],
        ['update', ['catalog:update']],
        ['remove', ['catalog:delete']],
        ['findPending', ['catalog:moderate']],
        ['setApproval', ['catalog:moderate']],
        ['findAll', undefined],
        ['findOne', undefined],
    ])('MediaItemController.%s exige %j', (handler, permissions) => {
        expect(required(MediaItemController.prototype, handler)).toEqual(permissions);
    });
});
