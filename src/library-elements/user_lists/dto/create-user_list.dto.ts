import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListVisibility } from '../../enums/library.enums.js';


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
