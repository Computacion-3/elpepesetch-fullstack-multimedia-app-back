import { PartialType } from '@nestjs/swagger';
import { CreateRevokedTokenDto } from './create-revoked-token.dto.js';

export class UpdateRevokedTokenDto extends PartialType(CreateRevokedTokenDto) {}
