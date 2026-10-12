import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../common/database/pg-errors.js';
import { Genre } from '../entities/genre.entity.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { UpdateGenreDto } from './dto/update-genre.dto.js';

@Injectable()
export class GenreService {
    constructor(@InjectRepository(Genre) private readonly repository: Repository<Genre>) {}
    create(createGenreDto: CreateGenreDto) {
        return this.saveOrConflict(this.repository.create(createGenreDto));
    }

    findAll() {
        return this.repository.find({ order: { name: 'ASC' } });
    }

    async findOne(id: string) {
        const entity = await this.repository.findOneBy({ id });
        if (!entity) throw new NotFoundException(`Genre ${id} not found`);
        return entity;
    }

    async update(id: string, updateGenreDto: UpdateGenreDto) {
        const entity = await this.findOne(id);
        return this.saveOrConflict(this.repository.merge(entity, updateGenreDto));
    }

    /** Un género asignado a elementos del catálogo no se elimina (409), para no desvincularlos en silencio. */
    async remove(id: string) {
        const entity = await this.repository.findOne({ where: { id }, relations: { mediaItems: true } });
        if (!entity) throw new NotFoundException(`Genre ${id} not found`);
        if (entity.mediaItems?.length) {
            throw new ConflictException('No se puede eliminar un género asignado a elementos del catálogo');
        }
        await this.repository.remove(entity);
        return { message: `Genre ${id} deleted successfully` };
    }

    private async saveOrConflict(genre: Genre): Promise<Genre> {
        try {
            return await this.repository.save(genre);
        } catch (error) {
            if (isUniqueViolation(error)) throw new ConflictException('Ya existe un género con ese nombre');
            throw error;
        }
    }
}
