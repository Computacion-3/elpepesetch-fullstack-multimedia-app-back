import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { LibraryStatus } from '../entities/library_entry.entity.js';
import { LibraryMediaType } from '../library-media-context.js';

export enum LibrarySortBy {
    TITLE = 'title',
    RELEASE_YEAR = 'releaseYear',
    AVERAGE_RATING = 'averageRating',
    ADDED_AT = 'addedAt',
}

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export class LibraryQueryDto {
    @IsOptional()
    @IsEnum(LibraryStatus)
    status?: LibraryStatus;

    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    isFavorite?: boolean;

    @IsOptional()
    @IsString()
    q?: string;

    @IsOptional()
    @IsEnum(LibraryMediaType)
    type?: LibraryMediaType;

    @IsOptional()
    @IsUUID()
    genreId?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @IsOptional()
    @IsEnum(LibrarySortBy)
    sortBy: LibrarySortBy = LibrarySortBy.ADDED_AT;

    @IsOptional()
    @IsEnum(SortOrder)
    order: SortOrder = SortOrder.ASC;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 10;
}
