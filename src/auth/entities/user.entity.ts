import { Exclude } from 'class-transformer';
import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Role } from './role.entity.js';
import { UserRole } from './user-role.entity.js';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 50 }) // Unique username with a maximum length of 50 characters
    username: string;

    @Column({ unique: true, length: 255 }) // Unique email address for each user
    email: string;

    @Exclude() // Nunca se serializa en las respuestas (ClassSerializerInterceptor global)
    @Column({ length: 255, name: 'password_hash' }) // Hashed password for each user
    passwordHash: string;

    @Column({ type: 'varchar', length: 100, nullable: true, name: 'full_name' }) // Optional full name of the user
    fullName: string | null;

    @Column({ length: 255, nullable: true }) // Optional short biography
    bio: string;

    @Column({ name: 'is_active', default: true }) // A deactivated account cannot log in; its data is kept
    isActive: boolean;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) // Automatically set the creation date of the user record to the current timestamp
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) // Automatically refreshed on every update
    updatedAt: Date;

    @ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: false }) // Many-to-one relationship with Role entity, meaning that each user can have one role, but a role can be assigned to many users
    @JoinColumn({ name: 'role_id' }) // Eager loading is enabled for the role relationship, meaning that when a user is fetched from the database, the associated role will be loaded automatically without needing to specify it in the query
    role: Relation<Role>; // This property represents the role associated with the user, is of type Role and not an array because it's a many-to-one relationship

    @OneToMany(() => UserRole, (userRole) => userRole.user) // One-to-many relationship with UserRole entity, meaning that a user can have many user-role relationships, but each user-role relationship is associated with one user
    userRoles: UserRole[]; // This property represents the user-role relationships associated with the user, is an array of UserRole because it's a one-to-many relationship
}
