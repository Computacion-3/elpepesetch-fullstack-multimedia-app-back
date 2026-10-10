import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportResolutionAction } from '../../enums/library.enums.js';

export class ResolveReviewReportDto {
    @ApiProperty({ enum: ReportResolutionAction })
    @IsEnum(ReportResolutionAction)
    action: ReportResolutionAction;

    @ApiPropertyOptional({ maxLength: 255, description: 'Obligatorio cuando action es HIDE' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    reason?: string;
}
