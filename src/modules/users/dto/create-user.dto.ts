import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ASSIGNABLE_ROLES, UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'sarah.johnson@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'Sarah Johnson', description: 'User full name' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @ApiPropertyOptional({ example: 'Password123!', description: 'Optional initial password. Defaults to UserPassword123!' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.VIEWER })
  @IsOptional()
  @IsEnum(ASSIGNABLE_ROLES, {
    message: `Role must be one of the following values: ${Object.values(ASSIGNABLE_ROLES).join(', ')}`,
  })
  role?: UserRole = UserRole.VIEWER;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus, {
    message: `Status must be one of the following values: ${Object.values(UserStatus).join(', ')}`,
  })
  status?: UserStatus = UserStatus.ACTIVE;

  @ApiPropertyOptional({ example: '+1 (555) 345-6789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Operations' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
