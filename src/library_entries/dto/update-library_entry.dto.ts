import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LibraryStatus } from '../entities/library_entry.entity.js';

export class UpdateLibraryEntryDto {
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
