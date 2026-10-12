import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ description: 'Customer UUID reserving the booking' })
  @IsUUID('4', { message: 'Must provide a valid user UUID' })
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: "Test Service",
    description: 'Requested service type',
  })
  @IsNotEmpty()
  @IsString()
  serviceType: string;

  @ApiProperty({
    example: '2026-10-15T14:00:00.000Z',
    description: 'Scheduled meeting start timestamp (ISO)',
  })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiProperty({
    example: '2:00 PM - 3:30 PM (EST)',
    description: 'Human-readable meeting time slot window',
  })
  @IsString()
  @IsNotEmpty()
  timeSlot: string;

  @ApiPropertyOptional({ example: 1.5, default: 1.0, description: 'Duration in hours' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  durationHours?: number = 1.0;

  @ApiPropertyOptional({
    example: 'Virtual - Zoom Link Provided',
    default: 'Virtual - Zoom Link Provided',
  })
  @IsOptional()
  @IsString()
  meetingLocation?: string = 'Virtual - Zoom Link Provided';

  @ApiPropertyOptional({ example: 180.0, default: 0.0, description: 'Service billing fee' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  billingAmount?: number = 0.0;

  @ApiPropertyOptional({
    example: 'Need assistance with expanding our payment gateway options and preparing our database backup plans.',
  })
  @IsOptional()
  @IsString()
  specialNotes?: string;
}
