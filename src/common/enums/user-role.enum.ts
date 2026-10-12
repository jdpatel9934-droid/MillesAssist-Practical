export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

// Use spread to extract SUPER_ADMIN out cleanly
const { SUPER_ADMIN, ...assignableRolesObject } = UserRole;

// Export the array to reuse across all DTOs
export const ASSIGNABLE_ROLES = Object.values(assignableRolesObject); 
