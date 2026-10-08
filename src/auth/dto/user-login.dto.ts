import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UserLoginDto {
    @ApiProperty({ description: 'Correo electrónico registrado', example: 'pepe@example.com' })
    @IsEmail({}, { message: 'El correo electrónico suministrado no es válido' })
    @IsNotEmpty({ message: 'El correo electrónico es requerido' })
    email!: string;

    @ApiProperty({ description: 'Contraseña de la cuenta', example: 'Secreta123', format: 'password' })
    @IsString()
    @IsNotEmpty({ message: 'La contraseña es requerida' })
    password!: string;
}
