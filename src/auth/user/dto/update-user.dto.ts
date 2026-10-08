import { PartialType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto.js';

/** Edición de un usuario por un administrador (puede incluir el rol). */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
