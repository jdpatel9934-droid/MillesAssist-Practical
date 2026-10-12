import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Customer UUID placing the transaction' })
  @IsUUID('4', { message: 'Must provide a valid user UUID' })
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 150.0, description: 'Total transaction amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @ApiPropertyOptional({ example: 4.9, description: 'Processing gateway fee' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee?: number = 0;

  @ApiPropertyOptional({ enum: TransactionType, default: TransactionType.PAYMENT })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType = TransactionType.PAYMENT;

  @ApiProperty({ example: 'Credit Card (Visa ending in 4582)', description: 'Payment method description' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiPropertyOptional({ example: 'Executive consultation service fee payment' })
  @IsOptional()
  @IsString()
  notes?: string;
}
