import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingPaymentStatus, BookingStatus } from '../../../common/enums/booking-status.enum';

export class UpdateBookingDto {
  @ApiPropertyOptional({ enum: BookingStatus, example: BookingStatus.CONFIRMED })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ example: "Test Service 1" })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ example: '2026-10-16T14:00:00.000Z', description: 'Rescheduled date' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ example: '3:00 PM - 4:30 PM (EST)' })
  @IsOptional()
  @IsString()
  timeSlot?: string;

  @ApiPropertyOptional({ example: 1.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  durationHours?: number;

  @ApiPropertyOptional({ example: 'Virtual - Zoom Link Provided' })
  @IsOptional()
  @IsString()
  meetingLocation?: string;

  @ApiPropertyOptional({ example: 180.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  billingAmount?: number;

  @ApiPropertyOptional({ enum: BookingPaymentStatus, example: BookingPaymentStatus.PAID })
  @IsOptional()
  @IsEnum(BookingPaymentStatus)
  paymentStatus?: BookingPaymentStatus;

  @ApiPropertyOptional({ example: 'Updated consultation agenda.' })
  @IsOptional()
  @IsString()
  specialNotes?: string;

  @ApiPropertyOptional({ example: 'Customer requested reschedule due to conflict.' })
  @IsOptional()
  @IsString()
  auditNote?: string;
}
