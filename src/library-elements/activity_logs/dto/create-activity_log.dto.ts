import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { ActivityAction } from '../../enums/library.enums.js';

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
