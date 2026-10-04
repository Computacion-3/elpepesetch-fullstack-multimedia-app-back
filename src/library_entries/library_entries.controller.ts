import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, Query } from '@nestjs/common';
import { LibraryEntriesService } from './library_entries.service.js';
import { CreateLibraryEntryDto } from './dto/create-library_entry.dto.js';
import { UpdateLibraryEntryDto } from './dto/update-library_entry.dto.js';
import { LibraryStatus } from './entities/library_entry.entity.js';

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
        @Query('status') status?: LibraryStatus,
        @Query('isFavorite') isFavorite?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.libraryEntriesService.findAll(userId, {
            status,
            isFavorite: isFavorite === undefined ? undefined : isFavorite === 'true',
            page: Number(page) || 1,
            limit: Number(limit) || 10,
        });
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
