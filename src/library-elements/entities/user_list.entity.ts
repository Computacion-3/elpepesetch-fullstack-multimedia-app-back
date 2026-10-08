import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../auth/entities/user.entity.js';
import { MediaItem } from './media-item.entity.js';
import { ListVisibility } from '../enums/library.enums.js';

@Entity('user_lists')
@Unique(['owner', 'name'])
export class UserList {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'owner_id' })
    owner: Relation<User>;

    @Column({ type: 'varchar', length: 80 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true, default: null })
    description: string | null;

    @Column({ type: 'enum', enum: ListVisibility, default: ListVisibility.PRIVATE })
    visibility: ListVisibility;

    @ManyToMany(() => MediaItem, (mediaItem) => mediaItem.lists)
    @JoinTable({
        name: 'list_items',
        joinColumn: { name: 'list_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'media_item_id', referencedColumnName: 'id' },
    })
    items: Relation<MediaItem[]>;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
