import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LibraryElementsService } from './library-elements.service.js';
import { CreateLibraryElementDto } from './dto/create-library-element.dto.js';
import { UpdateLibraryElementDto } from './dto/update-library-element.dto.js';

@Controller('library-elements')
export class LibraryElementsController {
    constructor(private readonly libraryElementsService: LibraryElementsService) {}

    @Post()
    create(@Body() createLibraryElementDto: CreateLibraryElementDto) {
        return this.libraryElementsService.create(createLibraryElementDto);
    }

    @Get()
    findAll() {
        return this.libraryElementsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.libraryElementsService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateLibraryElementDto: UpdateLibraryElementDto) {
        return this.libraryElementsService.update(+id, updateLibraryElementDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.libraryElementsService.remove(+id);
    }
}
