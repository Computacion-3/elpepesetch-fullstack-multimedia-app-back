import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { LibraryMediaItemType, LibraryPageMetaType } from '../../library_entries/graphql/library.types.js';
import { ListVisibility } from '../../enums/library.enums.js';

registerEnumType(ListVisibility, { name: 'ListVisibility' });

@ObjectType('UserListOwner')
export class UserListOwnerType {
    @Field(() => Int) id: number;
    @Field() username: string;
}

@ObjectType('UserList')
export class UserListType {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field(() => String, { nullable: true }) description: string | null;
    @Field(() => ListVisibility) visibility: ListVisibility;
    @Field(() => Date) createdAt: Date;
    @Field(() => Date) updatedAt: Date;
    @Field(() => UserListOwnerType) owner: UserListOwnerType;
    @Field(() => [LibraryMediaItemType]) items: LibraryMediaItemType[];
}

@ObjectType('PaginatedUserLists')
export class PaginatedUserListsType {
    @Field(() => [UserListType]) data: UserListType[];
    @Field(() => LibraryPageMetaType) meta: LibraryPageMetaType;
}
