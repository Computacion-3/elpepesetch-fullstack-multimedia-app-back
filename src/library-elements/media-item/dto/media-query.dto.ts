import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { MediaType } from '../../enums/library.enums.js';

export enum MediaSortBy {
    TITLE = 'title',
    RELEASE_YEAR = 'releaseYear',
    AVERAGE_RATING = 'averageRating',
}

export enum MediaSortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

/** Filtros, orden y paginación del catálogo (sección «Filtros, orden y paginación» de la especificación). */
export class MediaQueryDto {
    @ApiPropertyOptional({ description: 'Busca en el título o el creador' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    q?: string;

    @ApiPropertyOptional({ enum: MediaType })
    @IsOptional()
    @IsEnum(MediaType)
    type?: MediaType;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    genreId?: string;

    @ApiPropertyOptional({ type: Number, example: 2020 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    year?: number;

    @ApiPropertyOptional({ enum: MediaSortBy, default: MediaSortBy.TITLE })
    @IsOptional()
    @IsEnum(MediaSortBy)
    sortBy: MediaSortBy = MediaSortBy.TITLE;

    @ApiPropertyOptional({ enum: MediaSortOrder, default: MediaSortOrder.ASC })
    @IsOptional()
    @IsEnum(MediaSortOrder)
    order: MediaSortOrder = MediaSortOrder.ASC;

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
