import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { stringify } from 'csv-stringify';
import { Transaction } from './entities/transaction.entity';
import { TransactionHistory } from './entities/transaction-history.entity';
import { User } from '../users/entities/user.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { RedisService } from '../redis/redis.service';
import { DateFormatter } from '../../common/utils/date-formatter.util';
import { CurrencyFormatter } from '../../common/utils/currency-formatter.util';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionHistory)
    private readonly historyRepository: Repository<TransactionHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) { }

  private applyFilters(qb: SelectQueryBuilder<Transaction>, query: QueryTransactionsDto): void {
    if (query.search && query.search.trim() !== '') {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(txn.referenceId ILIKE :search OR txn.paymentReference ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search)',
        { search },
      );
    }

    if (query.status) {
      qb.andWhere('txn.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('txn.type = :type', { type: query.type });
    }

    // Date filtering
    if (query.dateRange === '30D') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      qb.andWhere('txn.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo });
    } else if (query.startDate && query.endDate) {
      qb.andWhere('txn.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    } else if (query.startDate) {
      qb.andWhere('txn.createdAt >= :startDate', { startDate: new Date(query.startDate) });
    } else if (query.endDate) {
      qb.andWhere('txn.createdAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    // Amount filtering
    if (query.amountRange === 'UNDER_1000') {
      qb.andWhere('txn.amount < :under1000', { under1000: 1000 });
    } else if (query.amountRange === '1000_10000') {
      qb.andWhere('txn.amount >= :min1000 AND txn.amount <= :max10000', {
        min1000: 1000,
        max10000: 10000,
      });
    } else if (query.amountRange === 'OVER_10000') {
      qb.andWhere('txn.amount > :over10000', { over10000: 10000 });
    }

    if (query.minAmount !== undefined) {
      qb.andWhere('txn.amount >= :minAmount', { minAmount: query.minAmount });
    }

    if (query.maxAmount !== undefined) {
      qb.andWhere('txn.amount <= :maxAmount', { maxAmount: query.maxAmount });
    }
  }

  private buildListCacheKey(query: QueryTransactionsDto): string {
    const { page = 1, limit = 10, search = '', status = '', type = '', dateRange = '', sortBy = 'createdAt', sortOrder = 'DESC', startDate = '', endDate = '', amountRange = '' } = query;
    return `transactions:list:${page}:${limit}:${search}:${status}:${type}:${dateRange}:${sortBy}:${sortOrder}:${startDate}:${endDate}:${amountRange}`;
  }

  async findAll(query: QueryTransactionsDto) {
    const cacheKey = this.buildListCacheKey(query);

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    } catch (cacheErr) {
      this.logger.warn(`Cache read failed for key ${cacheKey}: ${(cacheErr as Error).message}`);
    }

    try {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
      const skip = (page - 1) * limit;

      const qb = this.transactionRepository
        .createQueryBuilder('txn')
        .leftJoinAndSelect('txn.user', 'user');

      this.applyFilters(qb, query);

      const validSortFields: Record<string, string> = {
        createdAt: 'txn.createdAt',
        amount: 'txn.amount',
        status: 'txn.status',
        referenceId: 'txn.referenceId',
      };

      const sortColumn = validSortFields[query.sortBy || 'createdAt'] || 'txn.createdAt';
      const sortDirection = String(query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(sortColumn, sortDirection).skip(skip).take(limit);

      const [transactions, total] = await qb.getManyAndCount();

      const formattedData = transactions.map((t) => ({
        id: t.id,
        referenceId: t.referenceId,
        paymentReference: t.paymentReference,
        amount: Number(t.amount),
        formattedAmount: CurrencyFormatter.format(t.amount, t.currency),
        fee: Number(t.fee),
        subtotal: Number(t.subtotal),
        currency: t.currency,
        type: t.type,
        status: t.status,
        paymentMethod: t.paymentMethod,
        date: DateFormatter.formatDate(t.createdAt),
        createdAt: t.createdAt,
        user: t.user
          ? {
            id: t.user.id,
            fullName: t.user.fullName,
            email: t.user.email,
            avatarUrl: t.user.avatarUrl,
          }
          : null,
      }));

      const totalPages = Math.ceil(total / limit);
      const result = {
        data: formattedData,
        meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
      };

      await this.redisService.set(cacheKey, result, 30).catch((e) =>
        this.logger.warn(`Cache write failed: ${(e as Error).message}`),
      );

      return result;
    } catch (err) {
      this.logger.error(`findAll transactions failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve transactions. Please try again.');
    }
  }

  async getStats() {
    const cacheKey = 'transactions:stats';

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    } catch (cacheErr) {
      this.logger.warn(`Cache read failed: ${(cacheErr as Error).message}`);
    }

    try {
      const totalTransactions = await this.transactionRepository.count();

      const sumResult = await this.transactionRepository
        .createQueryBuilder('txn')
        .select('COALESCE(SUM(txn.amount), 0)', 'totalVolume')
        .addSelect('COALESCE(AVG(txn.amount), 0)', 'avgAmount')
        .where('txn.status IN (:...statuses)', { statuses: [TransactionStatus.COMPLETED, TransactionStatus.PAID] })
        .getRawOne();

      const totalVolume = parseFloat(sumResult?.totalVolume || '0');
      const avgAmount = parseFloat(sumResult?.avgAmount || '0');

      const successfulTransactions = await this.transactionRepository.count({
        where: [
          { status: TransactionStatus.COMPLETED },
          { status: TransactionStatus.PAID },
        ],
      });

      const successRate =
        totalTransactions > 0
          ? parseFloat(((successfulTransactions / totalTransactions) * 100).toFixed(1))
          : 100.0;

      const stats = {
        totalTransactions,
        totalVolume,
        formattedTotalVolume: CurrencyFormatter.format(totalVolume),
        avgAmount,
        formattedAvgAmount: CurrencyFormatter.format(avgAmount),
        successRate: `${successRate}%`,
      };

      await this.redisService.set(cacheKey, stats, 60).catch((e) =>
        this.logger.warn(`Cache write failed: ${(e as Error).message}`),
      );

      return stats;
    } catch (err) {
      this.logger.error(`getStats transactions failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve transaction statistics.');
    }
  }

  async findOne(id: string) {
    try {
      const transaction = await this.transactionRepository.findOne({
        where: { id },
        relations: ['user', 'history'],
      });

      if (!transaction) {
        throw new NotFoundException(`Transaction with ID '${id}' not found`);
      }

      // Sort processing history chronologically
      transaction.history = (transaction.history || []).sort(
        (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
      );

      // Fetch related customer ledger entries
      const relatedLedger = await this.transactionRepository.find({
        where: { userId: transaction.userId },
        order: { createdAt: 'DESC' },
        take: 5,
      });

      const relatedEntries = relatedLedger
        .filter((r) => r.id !== transaction.id)
        .map((r) => ({
          id: r.id,
          transactionId: r.referenceId,
          gatewayMethod: r.paymentMethod,
          amount: Number(r.amount),
          formattedAmount: CurrencyFormatter.format(r.amount, r.currency),
          status: r.status,
          settledAt: DateFormatter.formatDateTime(r.settledAt || r.createdAt),
        }));

      return {
        id: transaction.id,
        referenceId: transaction.referenceId,
        paymentReference: transaction.paymentReference,
        type: transaction.type,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        currency: transaction.currency,
        invoice: {
          subtotal: Number(transaction.subtotal),
          formattedSubtotal: CurrencyFormatter.format(transaction.subtotal, transaction.currency),
          fee: Number(transaction.fee),
          formattedFee: CurrencyFormatter.format(transaction.fee, transaction.currency),
          grandTotal: Number(transaction.amount),
          formattedGrandTotal: CurrencyFormatter.format(transaction.amount, transaction.currency),
        },
        customer: transaction.user
          ? {
            id: transaction.user.id,
            userCode: `USR-${transaction.user.id.substring(0, 4).toUpperCase()}`,
            fullName: transaction.user.fullName,
            email: transaction.user.email,
            avatarUrl: transaction.user.avatarUrl,
            phone: transaction.user.phone,
          }
          : null,
        processingHistory: transaction.history.map((h) => ({
          id: h.id,
          title: h.title,
          description: h.description,
          status: h.status,
          loggedAt: DateFormatter.formatDateTime(h.loggedAt),
          rawLoggedAt: h.loggedAt,
        })),
        relatedLedgerEntries: relatedEntries,
        createdAt: transaction.createdAt,
        formattedCreatedAt: DateFormatter.formatDateTime(transaction.createdAt),
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`findOne transaction failed [id=${id}]: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve transaction details.');
    }
  }

  async create(createDto: CreateTransactionDto) {
    const user = await this.userRepository.findOne({ where: { id: createDto.userId } });

    if (!user) {
      throw new NotFoundException(`Customer with ID '${createDto.userId}' not found`);
    }

    const fee = createDto.fee ?? Number((createDto.amount * 0.029).toFixed(2));
    const subtotal = Number((createDto.amount - fee).toFixed(2));
    const referenceId = `TXN-${Math.floor(Math.random() * 89999 + 10000)}`;
    const paymentReference = `REF-${Date.now()}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transaction = queryRunner.manager.create(Transaction, {
        referenceId,
        paymentReference,
        userId: user.id,
        amount: createDto.amount,
        fee,
        subtotal,
        currency: createDto.currency || 'USD',
        type: createDto.type,
        status: TransactionStatus.PENDING,
        paymentMethod: createDto.paymentMethod,
        notes: createDto.notes,
      });

      const savedTransaction = await queryRunner.manager.save(transaction);

      const initialHistory = queryRunner.manager.create(TransactionHistory, {
        transactionId: savedTransaction.id,
        title: 'Initiated',
        description: 'Checkout session initialized and payment pending',
        status: 'Initiated',
        loggedAt: new Date(),
      });

      await queryRunner.manager.save(initialHistory);
      await queryRunner.commitTransaction();

      await this.redisService.invalidateTransactions().catch((e) =>
        this.logger.warn(`Cache invalidation failed: ${(e as Error).message}`),
      );

      this.logger.log(`Transaction created: ${referenceId} for user ${user.email}`);
      return this.findOne(savedTransaction.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction creation failed: ${(err as Error).message}`, (err as Error).stack);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to create transaction. Transaction rolled back.');
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: string, updateDto: UpdateTransactionStatusDto) {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID '${id}' not found`);
    }

    const prevStatus = transaction.status;
    const nextStatus = updateDto.status;

    // Validate state machine transitions
    if (nextStatus === TransactionStatus.REFUNDED) {
      if (prevStatus !== TransactionStatus.COMPLETED && prevStatus !== TransactionStatus.PAID) {
        throw new BadRequestException(
          `Cannot refund a transaction in '${prevStatus}' status. Only COMPLETED or PAID transactions can be refunded.`,
        );
      }
    }

    if (prevStatus === TransactionStatus.REFUNDED && nextStatus !== TransactionStatus.REFUNDED) {
      throw new BadRequestException('A refunded transaction cannot be transitioned back to another status.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      transaction.status = nextStatus;
      if (nextStatus === TransactionStatus.COMPLETED || nextStatus === TransactionStatus.PAID) {
        transaction.settledAt = new Date();
      }

      await queryRunner.manager.save(transaction);

      let historyTitle = `Status updated to ${nextStatus}`;
      let historyDesc = updateDto.reason || `Status modified from ${prevStatus} to ${nextStatus}`;

      if (nextStatus === TransactionStatus.REFUNDED) {
        historyTitle = 'Refund Processed';
        historyDesc = updateDto.reason || 'Transaction refunded to original payment method';
      } else if (nextStatus === TransactionStatus.COMPLETED || nextStatus === TransactionStatus.PAID) {
        historyTitle = 'Completed & Disbursed';
        historyDesc = 'Settled in merchant bank account';
      }

      const historyLog = queryRunner.manager.create(TransactionHistory, {
        transactionId: transaction.id,
        title: historyTitle,
        description: historyDesc,
        status: nextStatus,
        loggedAt: new Date(),
      });

      await queryRunner.manager.save(historyLog);
      await queryRunner.commitTransaction();

      await this.redisService.invalidateTransactions().catch((e) =>
        this.logger.warn(`Cache invalidation failed: ${(e as Error).message}`),
      );

      this.logger.log(`Transaction status updated: ${id} — ${prevStatus} → ${nextStatus}`);
      return this.findOne(transaction.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction status update failed [id=${id}]: ${(err as Error).message}`, (err as Error).stack);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to update transaction status. Transaction rolled back.');
    } finally {
      await queryRunner.release();
    }
  }

  async exportCsvStream(query: QueryTransactionsDto) {
    try {
      const qb = this.transactionRepository
        .createQueryBuilder('txn')
        .leftJoinAndSelect('txn.user', 'user');

      this.applyFilters(qb, query);
      qb.orderBy('txn.createdAt', 'DESC');

      const transactions = await qb.getMany();

      const stringifier = stringify({
        header: true,
        columns: [
          { key: 'referenceId', header: 'Transaction ID' },
          { key: 'paymentReference', header: 'Payment Reference' },
          { key: 'userName', header: 'Customer' },
          { key: 'userEmail', header: 'Email' },
          { key: 'amount', header: 'Amount (USD)' },
          { key: 'fee', header: 'Fee (USD)' },
          { key: 'subtotal', header: 'Subtotal (USD)' },
          { key: 'status', header: 'Status' },
          { key: 'type', header: 'Type' },
          { key: 'paymentMethod', header: 'Payment Method' },
          { key: 'createdAt', header: 'Date' },
        ],
      });

      for (const t of transactions) {
        stringifier.write({
          referenceId: t.referenceId,
          paymentReference: t.paymentReference,
          userName: t.user ? t.user.fullName : 'N/A',
          userEmail: t.user ? t.user.email : 'N/A',
          amount: Number(t.amount).toFixed(2),
          fee: Number(t.fee).toFixed(2),
          subtotal: Number(t.subtotal).toFixed(2),
          status: t.status,
          type: t.type,
          paymentMethod: t.paymentMethod,
          createdAt: DateFormatter.formatDateTime(t.createdAt),
        });
      }

      stringifier.end();
      return stringifier;
    } catch (err) {
      this.logger.error(`CSV export failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to generate CSV export.');
    }
  }
}
