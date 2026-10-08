import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ReportReason } from '../../enums/library.enums.js';
export class CreateReviewReportDto {
    @ApiProperty() @IsUUID() reviewId: string;
    @ApiProperty({ enum: ReportReason }) @IsEnum(ReportReason) reason: ReportReason;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) details?: string;
}
