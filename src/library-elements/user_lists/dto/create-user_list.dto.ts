import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListVisibility } from '../../enums/library.enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class CreateUserListDto {
    @ApiProperty({ maxLength: 80 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;

    @ApiPropertyOptional({ maxLength: 255, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @ApiPropertyOptional({ enum: ListVisibility, default: ListVisibility.PRIVATE })
    @IsOptional()
    @IsEnum(ListVisibility)
    visibility?: ListVisibility;
}
