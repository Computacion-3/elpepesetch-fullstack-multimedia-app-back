import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLScalarType, valueFromASTUntyped } from 'graphql';
import { ActivityAction } from '../../enums/library.enums.js';
import { LibraryMediaItemType, LibraryPageMetaType } from '../../library_entries/graphql/library.types.js';

registerEnumType(ActivityAction, { name: 'ActivityAction' });

export const GraphQLJSON = new GraphQLScalarType({
    name: 'JSON',
    serialize: (value: unknown) => value,
    parseValue: (value: unknown) => value,
    parseLiteral: valueFromASTUntyped,
});

@ObjectType('ActivityLog')
export class ActivityLogType {
    @Field(() => ID) id: string;
    @Field(() => ActivityAction) action: ActivityAction;
    @Field(() => GraphQLJSON, { nullable: true }) metadata: Record<string, unknown> | null;
    @Field(() => Date) createdAt: Date;
    @Field(() => LibraryMediaItemType, { nullable: true }) mediaItem: LibraryMediaItemType | null;
}

@ObjectType('ActivityPagination')
export class ActivityPaginationType {
    @Field(() => [ActivityLogType]) data: ActivityLogType[];
    @Field(() => LibraryPageMetaType) meta: LibraryPageMetaType;
}
