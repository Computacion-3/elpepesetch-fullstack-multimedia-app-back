import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { LibraryEntriesService } from './library_entries.service.js';
import { CreateLibraryEntryDto } from './dto/create-library_entry.dto.js';
import { LibraryQueryDto } from './dto/library-query.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library_entry.dto.js';

@Controller('library')
export class LibraryEntriesController {
    constructor(private readonly libraryEntriesService: LibraryEntriesService) {}

    @Post()
    create(@Headers('x-user-id') userId: string, @Body() dto: CreateLibraryEntryDto) {
        return this.libraryEntriesService.create(userId, dto);
    }

    @Get()
    findAll(
        @Headers('x-user-id') userId: string,
        @Query() query: LibraryQueryDto,
    ) {
        return this.libraryEntriesService.findAll(userId, query);
    }

    @Get(':id')
    findOne(@Headers('x-user-id') userId: string, @Param('id') id: string) {
        return this.libraryEntriesService.findOne(userId, id);
    }

    @Patch(':id')
    update(@Headers('x-user-id') userId: string, @Param('id') id: string, @Body() dto: UpdateLibraryEntryDto) {
        return this.libraryEntriesService.update(userId, id, dto);
    }

    @Delete(':id')
    remove(@Headers('x-user-id') userId: string, @Param('id') id: string) {
        return this.libraryEntriesService.remove(userId, id);
    }
}
