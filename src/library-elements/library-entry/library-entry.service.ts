import { Injectable } from '@nestjs/common';
import { CreateLibraryEntryDto } from './dto/create-library-entry.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js';

@Injectable()
export class LibraryEntryService {
  create(createLibraryEntryDto: CreateLibraryEntryDto) {
    return 'This action adds a new libraryEntry';
  }

  findAll() {
    return `This action returns all libraryEntry`;
  }

  findOne(id: number) {
    return `This action returns a #${id} libraryEntry`;
  }

  update(id: number, updateLibraryEntryDto: UpdateLibraryEntryDto) {
    return `This action updates a #${id} libraryEntry`;
  }

  remove(id: number) {
    return `This action removes a #${id} libraryEntry`;
  }
}
