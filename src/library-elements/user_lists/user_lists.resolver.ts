import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { AddListItemDto } from './dto/add-list-item.dto.js';
import { CreateUserListDto } from './dto/create-user_list.dto.js';
import { ListQueryDto } from './dto/list-query.dto.js';
import { UpdateUserListDto } from './dto/update-user_list.dto.js';
import {
    AddListItemInput,
    CreateUserListInput,
    PublicListFilterInput,
    UpdateUserListInput,
} from './graphql/user-list.inputs.js';
import { PaginatedUserListsType, UserListType } from './graphql/user-list.types.js';
import { UserListsService } from './user_lists.service.js';

@Resolver(() => UserListType)
export class UserListsResolver {
    constructor(private readonly userListsService: UserListsService) {}

    @Query(() => [UserListType])
    myLists(@CurrentUser() user: AuthenticatedUser) {
        return this.userListsService.findAll(user.id, true);
    }

    @Query(() => PaginatedUserListsType)
    publicLists(
        @CurrentUser() user: AuthenticatedUser,
        @Args('filter', { type: () => PublicListFilterInput, nullable: true }) filter?: PublicListFilterInput,
    ) {
        return this.userListsService.findPublic(user.id, Object.assign(new ListQueryDto(), filter), true);
    }

    @Query(() => UserListType)
    userList(@CurrentUser() user: AuthenticatedUser, @Args('id', { type: () => ID }) id: string) {
        return this.userListsService.findOne(user.id, id, true);
    }

    @Mutation(() => UserListType)
    async createUserList(@CurrentUser() user: AuthenticatedUser, @Args('input') input: CreateUserListInput) {
        const list = await this.userListsService.create(user.id, Object.assign(new CreateUserListDto(), input));
        return { ...list, owner: { id: user.id, username: user.username } };
    }

    @Mutation(() => UserListType)
    updateUserList(
        @CurrentUser() user: AuthenticatedUser,
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdateUserListInput,
    ) {
        return this.userListsService.update(user.id, id, Object.assign(new UpdateUserListDto(), input), true);
    }

    @Mutation(() => Boolean)
    async deleteUserList(@CurrentUser() user: AuthenticatedUser, @Args('id', { type: () => ID }) id: string) {
        await this.userListsService.remove(user.id, id);
        return true;
    }

    @Mutation(() => UserListType)
    addItemToList(
        @CurrentUser() user: AuthenticatedUser,
        @Args('listId', { type: () => ID }) listId: string,
        @Args('input') input: AddListItemInput,
    ) {
        return this.userListsService.addItem(user.id, listId, Object.assign(new AddListItemDto(), input), true);
    }

    @Mutation(() => Boolean)
    async removeItemFromList(
        @CurrentUser() user: AuthenticatedUser,
        @Args('listId', { type: () => ID }) listId: string,
        @Args('mediaItemId', { type: () => ID }) mediaItemId: string,
    ) {
        await this.userListsService.removeItem(user.id, listId, mediaItemId);
        return true;
    }
}
