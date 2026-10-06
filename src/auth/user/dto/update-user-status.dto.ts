import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
    @ApiProperty({
        description: 'true activa la cuenta; false la desactiva (bloquea el inicio de sesión y conserva los datos)',
        example: false,
    })
    @IsBoolean({ message: 'isActive debe ser un valor booleano' })
    isActive: boolean;
}
