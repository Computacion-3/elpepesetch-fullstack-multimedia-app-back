import { Field, InputType } from '@nestjs/graphql';
import { PickType } from '@nestjs/swagger';

import { UserLoginDto } from '../dto/user-login.dto.js';
import { RegisterUserDto } from '../user/dto/register-user.dto.js';
import { UpdateProfileDto } from '../user/dto/update-profile.dto.js';

// Las reglas de validación (class-validator) se heredan de los DTO de REST:
// aquí solo se declaran los campos que se exponen en el esquema GraphQL.

@InputType('LoginInput')
export class LoginInput extends PickType(UserLoginDto, ['email', 'password'] as const) {
    @Field() email!: string;
    @Field() password!: string;
}

@InputType('RegisterInput')
export class RegisterInput extends RegisterUserDto {
    @Field() username!: string;
    @Field() email!: string;
    @Field() password!: string;
    @Field(() => String, { nullable: true }) fullName?: string;
    @Field(() => String, { nullable: true }) bio?: string;
}

/** Edición del perfil propio: todos los campos son opcionales y el rol no se puede cambiar. */
@InputType('UpdateProfileInput')
export class UpdateProfileInput extends UpdateProfileDto {
    @Field(() => String, { nullable: true }) username?: string;
    @Field(() => String, { nullable: true }) email?: string;
    @Field(() => String, { nullable: true }) password?: string;
    @Field(() => String, { nullable: true }) fullName?: string;
    @Field(() => String, { nullable: true }) bio?: string;
}
