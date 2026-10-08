import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto.js';

/** Edición del propio perfil: no permite cambiar el rol. */
export class UpdateProfileDto extends PartialType(OmitType(CreateUserDto, ['roleId'] as const)) {}
