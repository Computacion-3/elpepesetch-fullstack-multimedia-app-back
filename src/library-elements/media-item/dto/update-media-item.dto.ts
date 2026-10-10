import { PartialType } from '@nestjs/swagger';
import { CreateMediaItemDto } from './create-media-item.dto.js';

export class UpdateMediaItemDto extends PartialType(CreateMediaItemDto) {}
