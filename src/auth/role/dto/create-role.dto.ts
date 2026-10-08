import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({ description: 'Nombre único del rol', example: 'MODERATOR', maxLength: 50 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @ApiProperty({
        description: 'Descripción del rol',
        example: 'Revisa elementos y reseñas reportadas',
        maxLength: 255,
    })
    @IsString()
    @MaxLength(255)
    description: string;
}
