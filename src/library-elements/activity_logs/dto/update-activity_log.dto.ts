import { PartialType } from '@nestjs/mapped-types';
import { CreateActivityLogDto } from './create-activity_log.dto.js';

export class UpdateActivityLogDto extends PartialType(CreateActivityLogDto) {}
