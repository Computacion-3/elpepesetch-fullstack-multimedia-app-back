import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListVisibility } from '../entities/user_list.entity.js';

export class CreateUserListDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @IsOptional()
    @IsEnum(ListVisibility)
    visibility?: ListVisibility;
}
