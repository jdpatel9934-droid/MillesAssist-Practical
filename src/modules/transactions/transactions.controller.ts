import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Get()
  @ApiOperation({ summary: 'Paginated transaction list with search, filters and date filtering' })
  @ApiResponse({ status: 200, description: 'Paginated transactions list returned successfully.' })
  async findAll(@Query() query: QueryTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Transaction KPI statistics summary cards' })
  @ApiResponse({ status: 200, description: 'Summary statistics returned successfully.' })
  async getStats() {
    return this.transactionsService.getStats();
  }

  @Get('export')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export filtered transactions as a CSV file' })
  @ApiResponse({ status: 200, description: 'CSV stream returned.' })
  async exportCsv(@Query() query: QueryTransactionsDto, @Res() res: Response) {
    const filename = `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = await this.transactionsService.exportCsvStream(query);
    stream.pipe(res);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Transaction detail view with invoice breakdown and history timeline' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Transaction details returned successfully.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async create(@Body() createDto: CreateTransactionDto) {
    return this.transactionsService.create(createDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update transaction status or process refund' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Transaction status updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateStatus(id, updateDto);
  }
}
