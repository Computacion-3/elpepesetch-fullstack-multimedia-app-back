import { Field, InputType } from '@nestjs/graphql';
import { PickType } from '@nestjs/swagger';

import { UserLoginDto } from '../dto/user-login.dto.js';
import { RegisterUserDto } from '../user/dto/register-user.dto.js';

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
