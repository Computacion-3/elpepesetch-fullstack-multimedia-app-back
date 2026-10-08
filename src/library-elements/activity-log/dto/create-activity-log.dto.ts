import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';
import { ActivityAction } from '../../enums/library.enums.js';
export class CreateActivityLogDto {
    @ApiProperty() @IsUUID() userId: string;
    @ApiProperty({ enum: ActivityAction }) @IsEnum(ActivityAction) action: ActivityAction;
    @ApiPropertyOptional() @IsOptional() @IsUUID() mediaItemId?: string;
    @ApiPropertyOptional() @IsOptional() @IsUUID() libraryEntryId?: string;
    @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
