import { Field, Int, ObjectType } from '@nestjs/graphql';

// Mismas formas que las respuestas REST (UserResponseDto, LoginResponseDto...).
// passwordHash no se declara a propósito: nunca se puede pedir.

@ObjectType('Permission')
export class PermissionType {
    @Field(() => Int) id!: number;
    @Field() name!: string;
    @Field() description!: string;
}

@ObjectType('RolePermission')
export class RolePermissionType {
    @Field(() => Int) id!: number;
    @Field(() => PermissionType, { nullable: true }) permission?: PermissionType;
}

@ObjectType('Role')
export class RoleType {
    @Field(() => Int) id!: number;
    @Field() name!: string;
    @Field() description!: string;
    @Field(() => [RolePermissionType], { nullable: true }) rolePermissions?: RolePermissionType[];
}

@ObjectType('User')
export class UserType {
    @Field(() => Int) id!: number;
    @Field() username!: string;
    @Field() email!: string;
    @Field(() => String, { nullable: true }) fullName?: string | null;
    @Field(() => String, { nullable: true }) bio?: string | null;
    @Field() isActive!: boolean;
    @Field() createdAt!: Date;
    @Field() updatedAt!: Date;
    @Field(() => RoleType) role!: RoleType;
}

@ObjectType('LoginUser')
export class LoginUserType {
    @Field(() => Int) id!: number;
    @Field() username!: string;
    @Field() email!: string;
    @Field() role!: string;
}

@ObjectType('LoginResult')
export class LoginResultType {
    @Field() accessToken!: string;
    @Field() tokenType!: string;
    @Field(() => LoginUserType) user!: LoginUserType;
}
