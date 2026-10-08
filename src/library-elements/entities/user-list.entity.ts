import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { ListVisibility } from '../enums/library.enums.js';
import { MediaItem } from './media-item.entity.js';

@Entity('user_lists')
@Unique(['owner', 'name'])
export class UserList {
    @PrimaryGeneratedColumn('uuid') id: string;
    @Column({ length: 80 }) name: string;
    @Column({ length: 255, nullable: true }) description: string | null;
    @Column({ type: 'enum', enum: ListVisibility, default: ListVisibility.PRIVATE }) visibility: ListVisibility;
    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' }) owner: Relation<User>;
    @ManyToMany(() => MediaItem, (mediaItem) => mediaItem.lists)
    @JoinTable({ name: 'list_items' }) items: Relation<MediaItem[]>;
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
