import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
    @ApiProperty({
        description: 'Nombre único del permiso, usado por @Permissions()',
        example: 'users:manage',
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @ApiProperty({ description: 'Descripción del permiso', example: 'Gestionar usuarios', maxLength: 255 })
    @IsString()
    @MaxLength(255)
    description: string;
}
