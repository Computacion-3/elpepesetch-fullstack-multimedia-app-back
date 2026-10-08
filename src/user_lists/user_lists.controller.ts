import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common';
import { UserListsService } from './user_lists.service.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { ListQueryDto } from './dto/list-query.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';

@Controller('lists')
export class UserListsController {
    constructor(private readonly userListsService: UserListsService) {}

    @Post()
    create(@Headers('x-user-id') userId: string, @Body() dto: CreateUserListDto) {
        return this.userListsService.create(userId, dto);
    }

    @Get()
    findAll(@Headers('x-user-id') userId: string) {
        return this.userListsService.findAll(userId);
    }

    @Get('public')
    findPublic(@Headers('x-user-id') userId: string, @Query() query: ListQueryDto) {
        return this.userListsService.findPublic(userId, query);
    }

    @Get(':id')
    findOne(@Headers('x-user-id') userId: string, @Param('id') id: string) {
        return this.userListsService.findOne(userId, id);
    }

    @Patch(':id')
    update(@Headers('x-user-id') userId: string, @Param('id') id: string, @Body() dto: UpdateUserListDto) {
        return this.userListsService.update(userId, id, dto);
    }

    @Delete(':id')
    remove(@Headers('x-user-id') userId: string, @Param('id') id: string) {
        return this.userListsService.remove(userId, id);
    }

    @Post(':id/items')
    addItem(@Headers('x-user-id') userId: string, @Param('id') id: string, @Body() dto: AddListItemDto) {
        return this.userListsService.addItem(userId, id, dto);
    }

    @Delete(':id/items/:mediaItemId')
    removeItem(
        @Headers('x-user-id') userId: string,
        @Param('id') id: string,
        @Param('mediaItemId') mediaItemId: string,
    ) {
        return this.userListsService.removeItem(userId, id, mediaItemId);
    }
}
