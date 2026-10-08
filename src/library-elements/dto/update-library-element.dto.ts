import { PartialType } from '@nestjs/swagger';
import { CreateLibraryElementDto } from './create-library-element.dto.js';

export class UpdateLibraryElementDto extends PartialType(CreateLibraryElementDto) {}
