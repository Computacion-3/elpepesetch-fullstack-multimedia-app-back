import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { LibraryStatus } from '../../enums/library.enums.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLibraryEntryDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    mediaItemId: string;

    @ApiPropertyOptional({ enum: LibraryStatus, default: LibraryStatus.PENDING })
    @IsOptional()
    @IsEnum(LibraryStatus)
    status?: LibraryStatus;

    @ApiPropertyOptional({ minimum: 0, default: 0 })
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

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    isFavorite?: boolean;

    @ApiPropertyOptional({ nullable: true })
    @IsOptional()
    @IsString()
    notes?: string | null;
}
