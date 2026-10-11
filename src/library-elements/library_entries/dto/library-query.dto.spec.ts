import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LibraryQueryDto } from './library-query.dto.js';

describe('LibraryQueryDto', () => {
    it('accepts only true and false for isFavorite', async () => {
        const valid = await validate(plainToInstance(LibraryQueryDto, { isFavorite: 'false' }));
        const invalid = await validate(plainToInstance(LibraryQueryDto, { isFavorite: 'not-a-boolean' }));

        expect(valid).toHaveLength(0);
        expect(invalid.some((error) => error.property === 'isFavorite')).toBe(true);
    });
});
