import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGenreDto {
    @ApiProperty({ example: 'Fantasía' })
    @IsString() @IsNotEmpty() @MaxLength(50)
    name: string;
    @ApiPropertyOptional({ example: 'Historias con elementos mágicos' })
    @IsOptional() @IsString() @MaxLength(255)
    description?: string;
}
