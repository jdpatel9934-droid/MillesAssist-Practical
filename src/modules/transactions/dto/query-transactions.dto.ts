import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

export class QueryTransactionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TransactionStatus, description: 'Filter by transaction status' })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionType, description: 'Filter by transaction type' })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Filter by date preset: 30D | ALL' })
  @IsOptional()
  @IsString()
  dateRange?: string;

  @ApiPropertyOptional({ description: 'Filter by amount preset: UNDER_1000 | 1000_10000 | OVER_10000' })
  @IsOptional()
  @IsString()
  amountRange?: string;

  @ApiPropertyOptional({ description: 'Custom start date filter (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Custom end date filter (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum amount filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum amount filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;
}
