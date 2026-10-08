import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('revoked_tokens') // Tokens JWT cerrados con logout; se rechazan aunque no hayan expirado
export class RevokedToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 64 }) // Identificador único (jti) del token JWT
    jti: string;

    @Column({ name: 'expires_at', type: 'timestamptz' }) // Permite limpiar los registros vencidos
    expiresAt: Date;

    @CreateDateColumn({ name: 'revoked_at', type: 'timestamptz' })
    revokedAt: Date;
}
