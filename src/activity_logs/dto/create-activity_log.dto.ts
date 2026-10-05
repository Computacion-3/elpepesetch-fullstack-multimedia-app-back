import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { ActivityAction } from '../entities/activity_log.entity.js';

export class CreateActivityLogDto {
    @IsEnum(ActivityAction)
    action: ActivityAction;

    @IsOptional()
    @IsUUID()
    mediaItemId?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown> | null;
}
