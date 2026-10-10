import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateReviewDto {
    @ApiPropertyOptional({ maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    title?: string;

    @ApiPropertyOptional({ minLength: 10, maxLength: 2000 })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(2000)
    content?: string;
}
