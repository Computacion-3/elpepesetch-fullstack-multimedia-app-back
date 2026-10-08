import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PermissionResponseDto } from '../../permission/dto/permission-response.dto.js';

export class RolePermissionResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiPropertyOptional({
        type: () => PermissionResponseDto,
        description: 'Presente solo cuando se consulta el detalle del rol',
    })
    permission?: PermissionResponseDto;
}

export class RoleResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'ADMIN' })
    name: string;

    @ApiProperty({ example: 'Gestiona usuarios, roles y catálogo' })
    description: string;

    @ApiPropertyOptional({ type: () => [RolePermissionResponseDto] })
    rolePermissions?: RolePermissionResponseDto[];
}
