import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';

export class UpdateTransactionStatusDto {
  @ApiProperty({
    enum: TransactionStatus,
    description: 'Target transaction status',
    example: TransactionStatus.REFUNDED,
  })
  @IsEnum(TransactionStatus, { message: 'Must provide a valid transaction status' })
  @IsNotEmpty()
  status: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Reason or audit note for status modification',
    example: 'Customer requested refund following session cancellation',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
