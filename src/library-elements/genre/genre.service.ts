import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Genre } from '../entities/genre.entity.js';
import { CreateGenreDto } from './dto/create-genre.dto.js';
import { UpdateGenreDto } from './dto/update-genre.dto.js';

@Injectable()
export class GenreService {
    constructor(@InjectRepository(Genre) private readonly repository: Repository<Genre>) {}
    create(createGenreDto: CreateGenreDto) {
        return this.repository.save(this.repository.create(createGenreDto));
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
        return this.repository.save(this.repository.merge(entity, updateGenreDto));
    }

    async remove(id: string) {
        const entity = await this.findOne(id);
        await this.repository.remove(entity);
        return { message: `Genre ${id} deleted successfully` };
    }
}
