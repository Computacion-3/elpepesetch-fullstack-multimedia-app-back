import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Role } from './role.entity.js';
import { User } from './user.entity.js';

@Entity({ name: 'user_roles' }) // This decorator marks the class as a database entity and specifies the table name as 'user_roles'
export class UserRole {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Role, (role) => role.userRoles, { onDelete: 'CASCADE', nullable: false }) // Many-to-one relationship with Role entity, with cascade delete, meaning that if a role is deleted, all associated user-role relationships will also be deleted
    @JoinColumn({ name: 'role_id' }) // Specifies the foreign key column name for the relationship
    role: Role; // This property represents the role associated with this user-role relationship, is of type Role and not an array because it's a many-to-one relationship

    @ManyToOne(() => User, (user) => user.userRoles, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: User; // This property represents the user associated with this user-role relationship, is of type User and not an array because it's a many-to-one relationship
}
