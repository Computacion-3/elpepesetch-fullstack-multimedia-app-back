import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ListVisibility } from '../../enums/library.enums.js';

export class CreateUserListDto {
    @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) name: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) description?: string;
    @ApiPropertyOptional({ enum: ListVisibility }) @IsOptional() @IsEnum(ListVisibility) visibility?: ListVisibility;
    @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true }) itemIds?: string[];
}
