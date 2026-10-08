import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserListService } from './user-list.service.js';
import { CreateUserListDto } from './dto/create-user-list.dto.js';
import { UpdateUserListDto } from './dto/update-user-list.dto.js';

@Controller('user-list')
export class UserListController {
  constructor(private readonly userListService: UserListService) {}

  @Post()
  create(@Body() createUserListDto: CreateUserListDto) {
    return this.userListService.create(createUserListDto);
  }

  @Get()
  findAll() {
    return this.userListService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userListService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserListDto: UpdateUserListDto) {
    return this.userListService.update(+id, updateUserListDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userListService.remove(+id);
  }
}
