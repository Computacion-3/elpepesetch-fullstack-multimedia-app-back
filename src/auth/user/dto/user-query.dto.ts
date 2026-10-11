import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Filtros y paginación de GET /users. */
export class UserQueryDto {
    @ApiPropertyOptional({ description: 'Nombre del rol (USER, MODERATOR, ADMIN)', example: 'MODERATOR' })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
    role?: string;

    @ApiPropertyOptional({ description: 'true: cuentas activas; false: cuentas desactivadas', type: Boolean })
    @IsOptional()
    // Solo 'true'/'false' se convierten; cualquier otro valor llega tal cual y @IsBoolean responde 400
    @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
    @IsBoolean({ message: 'isActive debe ser true o false' })
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Busca en username, email y nombre completo (sin distinguir mayúsculas)' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    q?: string;

    @ApiPropertyOptional({ minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 10;
}
