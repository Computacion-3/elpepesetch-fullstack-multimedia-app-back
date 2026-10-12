import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { ApprovalStatus } from '../../enums/library.enums.js';

export class ApproveMediaItemDto {
    @ApiProperty({ enum: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] })
    @IsIn([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED], {
        message: 'approvalStatus debe ser APPROVED o REJECTED',
    })
    approvalStatus: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED;

    @ApiPropertyOptional({ description: 'Obligatorio si se rechaza', maxLength: 255 })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    rejectionReason?: string;
}
