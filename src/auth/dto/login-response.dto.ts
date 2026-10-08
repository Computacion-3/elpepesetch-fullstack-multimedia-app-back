import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
    @ApiProperty({ example: 1 })
    id: number;

    @ApiProperty({ example: 'pepe_set' })
    username: string;

    @ApiProperty({ example: 'pepe@example.com' })
    email: string;

    @ApiProperty({ example: 'USER' })
    role: string;
}

export class LoginResponseDto {
    @ApiProperty({ description: 'JWT firmado; enviarlo como `Authorization: Bearer <token>`' })
    accessToken: string;

    @ApiProperty({ example: 'Bearer' })
    tokenType: string;

    @ApiProperty({ type: () => LoginUserDto })
    user: LoginUserDto;
}
