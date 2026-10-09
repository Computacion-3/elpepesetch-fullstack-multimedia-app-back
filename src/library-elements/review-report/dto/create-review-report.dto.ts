import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason } from '../../enums/library.enums.js';
export class CreateReviewReportDto {
    @ApiProperty({ enum: ReportReason }) @IsEnum(ReportReason) reason: ReportReason;
    @ApiPropertyOptional({ maxLength: 255, description: 'Comentario adicional del reporte' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    comment?: string;
}
