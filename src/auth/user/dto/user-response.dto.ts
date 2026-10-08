import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RoleResponseDto } from '../../role/dto/role-response.dto.js';

/** Representación pública de un usuario: nunca incluye la contraseña ni su hash. */
export class UserResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'pepe_set' })
    username: string;

    @ApiProperty({ example: 'pepe@example.com' })
    email: string;

    @ApiPropertyOptional({ nullable: true, type: String, example: 'José Pérez' })
    fullName?: string | null;

    @ApiPropertyOptional({ nullable: true, type: String, example: 'Fan de los RPG' })
    bio?: string | null;

    @ApiProperty({ description: 'Si es false la cuenta no puede iniciar sesión', example: true })
    isActive: boolean;

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ type: String, format: 'date-time' })
    updatedAt: Date;

    @ApiProperty({ type: () => RoleResponseDto })
    role: RoleResponseDto;
}
