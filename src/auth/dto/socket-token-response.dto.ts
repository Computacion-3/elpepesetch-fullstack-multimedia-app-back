import { ApiProperty } from '@nestjs/swagger';

export class SocketTokenResponseDto {
    @ApiProperty({
        description:
            'JWT de un solo uso para el handshake de Socket.IO: `io(url, { auth: { token } })`. No sirve como Bearer en HTTP.',
    })
    token: string;

    @ApiProperty({ description: 'Segundos de vigencia del ticket', example: 60 })
    expiresIn: number;
}
