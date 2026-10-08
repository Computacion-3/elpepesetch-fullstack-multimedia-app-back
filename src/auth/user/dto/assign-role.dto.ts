import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AssignRoleDto {
    @ApiProperty({ description: 'Id del rol que se asignará al usuario', example: 2 })
    @IsInt({ message: 'El id del rol debe ser un número entero' })
    @IsPositive({ message: 'El id del rol debe ser positivo' })
    roleId: number;
}
