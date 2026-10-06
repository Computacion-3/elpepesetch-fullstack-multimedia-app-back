import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt, IsPositive } from 'class-validator';

export class SetRolePermissionsDto {
    @ApiProperty({
        description:
            'Ids de los permisos que tendrá el rol. Reemplaza el conjunto anterior (lista vacía = sin permisos).',
        type: [Number],
        example: [1, 2],
    })
    @IsArray()
    @ArrayUnique()
    @IsInt({ each: true })
    @IsPositive({ each: true })
    permissionIds: number[];
}
