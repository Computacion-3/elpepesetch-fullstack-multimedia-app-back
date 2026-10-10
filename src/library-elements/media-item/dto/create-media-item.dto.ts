import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';
import { MediaType } from '../../enums/library.enums.js';

export class CreateMediaItemDto {
    @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) title: string;
    @ApiProperty({ enum: MediaType }) @IsEnum(MediaType) type: MediaType;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiProperty({ example: 2020 }) @IsInt() @Min(1900) @Max(2100) releaseYear: number;
    @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) creator: string;
    @ApiPropertyOptional() @IsOptional() @IsUrl() @MaxLength(500) coverUrl?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) platform?: string;
    @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) durationMinutes?: number;
    @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) pages?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) isbn?: string;
    @ApiPropertyOptional({ type: [String] }) @IsOptional() genreIds?: string[];
}
