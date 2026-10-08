import { Injectable } from '@nestjs/common';
import { CreateRevokedTokenDto } from './dto/create-revoked-token.dto.js';
import { UpdateRevokedTokenDto } from './dto/update-revoked-token.dto.js';

@Injectable()
export class RevokedTokenService {
  create(createRevokedTokenDto: CreateRevokedTokenDto) {
    return 'This action adds a new revokedToken';
  }

  findAll() {
    return `This action returns all revokedToken`;
  }

  findOne(id: number) {
    return `This action returns a #${id} revokedToken`;
  }

  update(id: number, updateRevokedTokenDto: UpdateRevokedTokenDto) {
    return `This action updates a #${id} revokedToken`;
  }

  remove(id: number) {
    return `This action removes a #${id} revokedToken`;
  }
}
