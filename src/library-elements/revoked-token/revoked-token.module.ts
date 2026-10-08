import { Module } from '@nestjs/common';
import { RevokedTokenService } from './revoked-token.service.js';
import { RevokedTokenController } from './revoked-token.controller.js';

@Module({
  controllers: [RevokedTokenController],
  providers: [RevokedTokenService],
})
export class RevokedTokenModule {}
