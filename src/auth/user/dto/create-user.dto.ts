import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
    @ApiProperty({
        description: 'Nombre de usuario único (letras, números y guion bajo)',
        example: 'pepe_set',
        minLength: 3,
        maxLength: 30,
    })
    @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
    @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
    @MinLength(3, { message: 'El nombre de usuario debe contener al menos 3 caracteres' })
    @MaxLength(30, { message: 'El nombre de usuario no puede exceder 30 caracteres' })
    @Matches(/^\w+$/, { message: 'El nombre de usuario solo admite letras, números y guion bajo' })
    username: string;

    @ApiProperty({ description: 'Correo electrónico único', example: 'pepe@example.com' })
    @IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
    @IsNotEmpty({ message: 'El correo electrónico es requerido' })
    email: string;

    @ApiProperty({
        description:
            'Contraseña en texto plano (mín. 8 caracteres, con mayúscula, minúscula y número). Se almacena con hash bcrypt.',
        example: 'Secreta123',
        minLength: 8,
        format: 'password',
    })
    @IsString()
    @MinLength(8, { message: 'La contraseña debe tener mínimo 8 caracteres' })
    @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'La contraseña debe incluir al menos una mayúscula, una minúscula y un número',
    })
    password: string;

    @ApiPropertyOptional({ description: 'Nombre completo', example: 'José Pérez', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100, { message: 'El nombre completo no puede exceder 100 caracteres' })
    fullName?: string;

    @ApiPropertyOptional({
        description: 'Biografía del usuario',
        example: 'Fan de los RPG y la ciencia ficción',
        maxLength: 200,
    })
    @IsOptional()
    @IsString()
    @MaxLength(200, { message: 'La biografía no puede exceder 200 caracteres' })
    bio?: string;

    @ApiProperty({ description: 'Id del rol asignado al usuario', example: 1 })
    @IsInt({ message: 'El id del rol debe ser un número entero' })
    @IsNotEmpty({ message: 'Debe especificar el id del rol del usuario' })
    roleId: number;
}
