import { Field, InputType, Int } from '@nestjs/graphql';
import { AddListItemDto } from '../dto/add-list-item.dto.js';
import { CreateUserListDto } from '../dto/create-user_list.dto.js';
import { ListQueryDto } from '../dto/list-query.dto.js';
import { UpdateUserListDto } from '../dto/update-user_list.dto.js';
import { ListVisibility } from '../../enums/library.enums.js';

@InputType('PublicListFilterInput')
export class PublicListFilterInput extends ListQueryDto {
    @Field(() => Int, { nullable: true }) declare page: number;
    @Field(() => Int, { nullable: true }) declare limit: number;
}

@InputType('CreateUserListInput')
export class CreateUserListInput extends CreateUserListDto {
    @Field() declare name: string;
    @Field(() => String, { nullable: true }) declare description?: string;
    @Field(() => ListVisibility, { nullable: true }) declare visibility?: ListVisibility;
}

@InputType('UpdateUserListInput')
export class UpdateUserListInput extends UpdateUserListDto {
    @Field(() => String, { nullable: true }) declare name?: string;
    @Field(() => String, { nullable: true }) declare description?: string | null;
    @Field(() => ListVisibility, { nullable: true }) declare visibility?: ListVisibility;
}

@InputType('AddListItemInput')
export class AddListItemInput extends AddListItemDto {
    @Field() declare mediaItemId: string;
}
