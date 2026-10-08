import { PartialType } from '@nestjs/swagger';
import { CreateUserListDto } from './create-user-list.dto.js';

export class UpdateUserListDto extends PartialType(CreateUserListDto) {}
