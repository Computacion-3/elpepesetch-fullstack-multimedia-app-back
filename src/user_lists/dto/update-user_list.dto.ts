import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListVisibility } from '../entities/user_list.entity.js';

export class UpdateUserListDto {
    @IsOptional()
    @IsString()
    @MaxLength(80)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string | null;

    @IsOptional()
    @IsEnum(ListVisibility)
    visibility?: ListVisibility;
}
