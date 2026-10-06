import { OmitType } from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto.js';

/** Registro público: el rol no se acepta del cliente, siempre se asigna el rol por defecto (USER). */
export class RegisterUserDto extends OmitType(CreateUserDto, ['roleId'] as const) {}
