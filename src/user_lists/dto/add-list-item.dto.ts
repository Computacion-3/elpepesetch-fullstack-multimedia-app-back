import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddListItemDto {
    @IsUUID()
    @IsNotEmpty()
    mediaItemId: string;
}
