import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LibraryEntryService } from './library-entry.service.js';
import { CreateLibraryEntryDto } from './dto/create-library-entry.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library-entry.dto.js';

@Controller('library-entry')
export class LibraryEntryController {
  constructor(private readonly libraryEntryService: LibraryEntryService) {}

  @Post()
  create(@Body() createLibraryEntryDto: CreateLibraryEntryDto) {
    return this.libraryEntryService.create(createLibraryEntryDto);
  }

  @Get()
  findAll() {
    return this.libraryEntryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.libraryEntryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLibraryEntryDto: UpdateLibraryEntryDto) {
    return this.libraryEntryService.update(+id, updateLibraryEntryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.libraryEntryService.remove(+id);
  }
}
