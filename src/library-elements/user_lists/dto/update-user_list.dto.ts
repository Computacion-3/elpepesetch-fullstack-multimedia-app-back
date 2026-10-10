import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListVisibility } from '../../enums/library.enums.js';
import { ApiPropertyOptional } from '@nestjs/swagger';


export class UpdateUserListDto {
    @ApiPropertyOptional({ maxLength: 80 })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    name?: string;

    @ApiPropertyOptional({ maxLength: 255, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;

    @ApiPropertyOptional({ enum: ListVisibility })
    @IsOptional()
    @IsEnum(ListVisibility)
    visibility?: ListVisibility;
}
