import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { LibraryStatus } from '../../enums/library.enums.js';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLibraryEntryDto {
    @ApiPropertyOptional({ enum: LibraryStatus })
    @IsOptional()
    @IsEnum(LibraryStatus)
    status?: LibraryStatus;

    @ApiPropertyOptional({ minimum: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    progress?: number;

    @ApiPropertyOptional({ minimum: 1, maximum: 10, nullable: true })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(10)
    rating?: number | null;

    @ApiPropertyOptional()
    @IsOptional()
    isFavorite?: boolean;

    @ApiPropertyOptional({ nullable: true })
    @IsOptional()
    @IsString()
    notes?: string | null;
}
