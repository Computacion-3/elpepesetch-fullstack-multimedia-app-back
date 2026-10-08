import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { LibraryStatus } from '../../enums/library.enums.js';

export class CreateLibraryEntryDto {
    @ApiProperty() @IsUUID() mediaItemId: string;
    @ApiPropertyOptional({ enum: LibraryStatus }) @IsOptional() @IsEnum(LibraryStatus) status?: LibraryStatus;
    @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) progress?: number;
    @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10) rating?: number;
    @ApiPropertyOptional() @IsOptional() isFavorite?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
