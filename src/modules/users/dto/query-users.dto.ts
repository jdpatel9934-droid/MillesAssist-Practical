import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ASSIGNABLE_ROLES, UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

export class QueryUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(ASSIGNABLE_ROLES, {
    message: `Role must be one of the following values: ${Object.values(ASSIGNABLE_ROLES).join(', ')}`,
  })
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(UserStatus, {
    message: `Status must be one of the following values: ${Object.values(UserStatus).join(', ')}`,
  })
  status?: UserStatus;
}
