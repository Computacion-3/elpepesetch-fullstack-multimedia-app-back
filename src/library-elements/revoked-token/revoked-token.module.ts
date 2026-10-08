import { Module } from '@nestjs/common';
import { RevokedTokenService } from './revoked-token.service.js';
import { RevokedTokenController } from './revoked-token.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RevokedToken } from '../../auth/entities/revoked-token.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([RevokedToken])],
  controllers: [RevokedTokenController],
  providers: [RevokedTokenService],
})
export class RevokedTokenModule {}
