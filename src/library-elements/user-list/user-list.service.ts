import { Injectable } from '@nestjs/common';
import { CreateUserListDto } from './dto/create-user-list.dto.js';
import { UpdateUserListDto } from './dto/update-user-list.dto.js';

@Injectable()
export class UserListService {
  create(createUserListDto: CreateUserListDto) {
    return 'This action adds a new userList';
  }

  findAll() {
    return `This action returns all userList`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userList`;
  }

  update(id: number, updateUserListDto: UpdateUserListDto) {
    return `This action updates a #${id} userList`;
  }

  remove(id: number) {
    return `This action removes a #${id} userList`;
  }
}
