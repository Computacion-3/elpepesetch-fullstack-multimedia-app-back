import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'users:manage' })
    name: string;

    @ApiProperty({ example: 'Gestionar usuarios' })
    description: string;
}
