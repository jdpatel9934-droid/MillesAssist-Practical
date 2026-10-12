import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { BookingStatus } from '../../../common/enums/booking-status.enum';

export enum WhenStatus {
  UPCOMING = 'upcoming',
  PAST = 'past',
}

export class QueryBookingsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Filter by service type' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ enum: WhenStatus, description: 'Temporal filter: UPCOMING | PAST' })
  @IsOptional()
  @IsEnum(WhenStatus)
  when?: WhenStatus;

  @ApiPropertyOptional({ description: 'Start date filter (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
