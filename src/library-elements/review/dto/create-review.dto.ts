import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateReviewDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) title?: string;
    @ApiProperty() @IsString() @IsNotEmpty() @MinLength(10) @MaxLength(2000) content: string;
}
