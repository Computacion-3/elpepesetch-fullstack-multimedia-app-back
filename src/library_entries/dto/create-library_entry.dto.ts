import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { LibraryStatus } from '../entities/library_entry.entity.js';

export class CreateLibraryEntryDto {
    @IsUUID()
    @IsNotEmpty()
    mediaItemId: string;

    @IsOptional()
    @IsEnum(LibraryStatus)
    status?: LibraryStatus;

    @IsOptional()
    @IsInt()
    @Min(0)
    progress?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    rating?: number | null;

    @IsOptional()
    isFavorite?: boolean;

    @IsOptional()
    @IsString()
    notes?: string | null;
}
