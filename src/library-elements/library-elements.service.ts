import { Injectable } from '@nestjs/common';
import { CreateLibraryElementDto } from './dto/create-library-element.dto.js';
import { UpdateLibraryElementDto } from './dto/update-library-element.dto.js';

@Injectable()
export class LibraryElementsService {
  create(createLibraryElementDto: CreateLibraryElementDto) {
    return 'This action adds a new libraryElement';
  }

  findAll() {
    return `This action returns all libraryElements`;
  }

  findOne(id: number) {
    return `This action returns a #${id} libraryElement`;
  }

  update(id: number, updateLibraryElementDto: UpdateLibraryElementDto) {
    return `This action updates a #${id} libraryElement`;
  }

  remove(id: number) {
    return `This action removes a #${id} libraryElement`;
  }
}
