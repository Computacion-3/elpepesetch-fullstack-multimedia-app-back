import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

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

    @Column({ length: 255, name: 'password_hash' }) // Hashed password for each user
    passwordHash: string;

    @Column({ length: 255, nullable: true }) // Optional full name of the user
    bio: string;

    @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) // Automatically set the creation date of the user record to the current timestamp
    createdAt: Date;

    @ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: false }) // Many-to-one relationship with Role entity, meaning that each user can have one role, but a role can be assigned to many users
    @JoinColumn({ name: 'role_id' }) // Eager loading is enabled for the role relationship, meaning that when a user is fetched from the database, the associated role will be loaded automatically without needing to specify it in the query
    role: Role; // This property represents the role associated with the user, is of type Role and not an array because it's a many-to-one relationship

    @OneToMany(() => UserRole, (userRole) => userRole.user) // One-to-many relationship with UserRole entity, meaning that a user can have many user-role relationships, but each user-role relationship is associated with one user
    userRoles: UserRole[]; // This property represents the user-role relationships associated with the user, is an array of UserRole because it's a one-to-many relationship
}
