import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ChartRange {
  SEVEN_DAYS = '7D',
  ONE_MONTH = '1M',
  THREE_MONTHS = '3M',
  SIX_MONTHS = '6M',
  ONE_YEAR = '1Y',
}

export class ChartQueryDto {
  @ApiPropertyOptional({
    enum: ChartRange,
    default: ChartRange.SIX_MONTHS,
    description: 'Time window for chart series aggregation (7D, 1M, 3M, 6M, 1Y)',
  })
  @IsOptional()
  @IsEnum(ChartRange)
  range?: ChartRange = ChartRange.SIX_MONTHS;
}
