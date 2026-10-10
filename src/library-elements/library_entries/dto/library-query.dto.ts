import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { LibraryStatus, MediaType } from '../../enums/library.enums.js';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
    @ApiPropertyOptional({ enum: LibraryStatus })
    @IsOptional()
    @IsEnum(LibraryStatus)
    status?: LibraryStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    isFavorite?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({ enum: MediaType })
    @IsOptional()
    @IsEnum(MediaType)
    type?: MediaType;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    genreId?: string;

    @ApiPropertyOptional({ type: Number })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @ApiPropertyOptional({ enum: LibrarySortBy, default: LibrarySortBy.ADDED_AT })
    @IsOptional()
    @IsEnum(LibrarySortBy)
    sortBy: LibrarySortBy = LibrarySortBy.ADDED_AT;

    @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.ASC })
    @IsOptional()
    @IsEnum(SortOrder)
    order: SortOrder = SortOrder.ASC;

    @ApiPropertyOptional({ minimum: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit = 10;
}
