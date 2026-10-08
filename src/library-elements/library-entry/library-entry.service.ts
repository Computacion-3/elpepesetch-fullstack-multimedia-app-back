import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryEntry } from '../entities/library-entry.entity.js';
import { CreateLibraryEntryDto } from './dto/create-library-entry.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js';

@Injectable()
export class LibraryEntryService {
  constructor(@InjectRepository(LibraryEntry) private readonly repository: Repository<LibraryEntry>) {}
  create(createLibraryEntryDto: CreateLibraryEntryDto) {
    const { mediaItemId: _mediaItemId, ...data } = createLibraryEntryDto;
    return this.repository.save(this.repository.create(data));
  }

  findAll() {
    return this.repository.find({ relations: { mediaItem: true, user: true } });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id }, relations: { mediaItem: true, user: true } });
    if (!entity) throw new NotFoundException(`Library entry ${id} not found`);
    return entity;
  }

  async update(id: string, updateLibraryEntryDto: UpdateLibraryEntryDto) {
    const entity = await this.findOne(id);
    const { mediaItemId: _mediaItemId, ...data } = updateLibraryEntryDto;
    return this.repository.save(this.repository.merge(entity, data));
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { message: `Library entry ${id} deleted successfully` };
  }
}
