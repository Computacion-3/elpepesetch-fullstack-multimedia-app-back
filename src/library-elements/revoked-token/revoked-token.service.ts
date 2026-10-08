import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevokedToken } from '../../auth/entities/revoked-token.entity.js';
import { CreateRevokedTokenDto } from './dto/create-revoked-token.dto.js';
import { UpdateRevokedTokenDto } from './dto/update-revoked-token.dto.js';

@Injectable()
export class RevokedTokenService {
  constructor(@InjectRepository(RevokedToken) private readonly repository: Repository<RevokedToken>) {}
  create(createRevokedTokenDto: CreateRevokedTokenDto) {
    return this.repository.save(this.repository.create({
      ...createRevokedTokenDto,
      expiresAt: new Date(createRevokedTokenDto.expiresAt),
    }));
  }

  findAll() {
    return this.repository.find({ order: { revokedAt: 'DESC' } });
  }

  async findOne(id: string) {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Revoked token ${id} not found`);
    return entity;
  }

  async update(id: string, updateRevokedTokenDto: UpdateRevokedTokenDto) {
    const entity = await this.findOne(id);
    return this.repository.save(this.repository.merge(entity, updateRevokedTokenDto));
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { message: `Revoked token ${id} deleted successfully` };
  }
}
