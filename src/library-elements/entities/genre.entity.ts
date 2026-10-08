import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { MediaItem } from './media-item.entity.js';

@Entity('genres')
export class Genre {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true, length: 50 })
    name: string;

    @Column({ length: 255, nullable: true })
    description: string | null;

    @ManyToMany(() => MediaItem, (mediaItem) => mediaItem.genres)
    mediaItems: Relation<MediaItem[]>;
}
