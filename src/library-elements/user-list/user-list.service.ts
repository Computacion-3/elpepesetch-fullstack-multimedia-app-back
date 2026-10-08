import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserList } from '../entities/user-list.entity.js';
import { CreateUserListDto } from './dto/create-user-list.dto.js';
import { UpdateUserListDto } from './dto/update-user-list.dto.js';

@Injectable()
export class UserListService {
  constructor(@InjectRepository(UserList) private readonly repository: Repository<UserList>) {}
  create(createUserListDto: CreateUserListDto) {
    const { itemIds: _itemIds, ...data } = createUserListDto;
    return this.repository.save(this.repository.create(data));
  }

  findAll() {
    return this.repository.find({ relations: { items: true, owner: true } });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOne({ where: { id }, relations: { items: true, owner: true } });
    if (!entity) throw new NotFoundException(`User list ${id} not found`);
    return entity;
  }

  async update(id: string, updateUserListDto: UpdateUserListDto) {
    const entity = await this.findOne(id);
    const { itemIds: _itemIds, ...data } = updateUserListDto;
    return this.repository.save(this.repository.merge(entity, data));
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { message: `User list ${id} deleted successfully` };
  }
}
