import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MediaItemService } from './media-item.service.js';
import { CreateMediaItemDto } from './dto/create-media-item.dto.js';
import { UpdateMediaItemDto } from './dto/update-media-item.dto.js';

@Controller('media-item')
export class MediaItemController {
    constructor(private readonly mediaItemService: MediaItemService) {}

    @Post()
    create(@Body() createMediaItemDto: CreateMediaItemDto) {
        return this.mediaItemService.create(createMediaItemDto);
    }

    @Get()
    findAll() {
        return this.mediaItemService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.mediaItemService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateMediaItemDto: UpdateMediaItemDto) {
        return this.mediaItemService.update(id, updateMediaItemDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.mediaItemService.remove(id);
    }
}
