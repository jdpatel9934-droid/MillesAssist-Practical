import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserStatus } from '../../common/enums/user-status.enum';
import { RedisService } from '../redis/redis.service';
import { TransactionStatus } from '@/common/enums/transaction-status.enum';
import { BookingStatus } from '@/common/enums/booking-status.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly redisService: RedisService,
  ) { }

  async findAllUsers(query: QueryUsersDto) {
    try {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
      const skip = (page - 1) * limit;

      const qb = this.userRepository.createQueryBuilder('user');

      if (query.search && query.search.trim() !== '') {
        const searchTerm = `%${query.search.trim()}%`;
        qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
          search: searchTerm,
        });
      }

      if (query.role) {
        qb.andWhere('user.role = :role', { role: query.role });
      }

      if (query.status) {
        qb.andWhere('user.status = :status', { status: query.status });
      }

      const validSortFields: Record<string, string> = {
        createdAt: 'user.createdAt',
        fullName: 'user.fullName',
        email: 'user.email',
        role: 'user.role',
        status: 'user.status',
      };

      const sortColumn = validSortFields[query.sortBy || 'createdAt'] || 'user.createdAt';
      const sortDirection = String(query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(sortColumn, sortDirection).skip(skip).take(limit);

      const [users, total] = await qb.getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        data: users,
        meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
      };
    } catch (err) {
      this.logger.error(`findAllUsers failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve users. Please try again.');
    }
  }

  async getStats() {
    const cacheKey = 'users:stats';

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    } catch (cacheErr) {
      this.logger.warn(`Cache read failed: ${(cacheErr as Error).message}`);
    }

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [totalUsers, activeUsers, newThisMonth] = await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
        this.userRepository
          .createQueryBuilder('user')
          .where('user.createdAt >= :startOfMonth', { startOfMonth })
          .getCount(),
      ]);

      const stats = { totalUsers, activeUsers, newThisMonth };

      await this.redisService.set(cacheKey, stats, 60).catch((e) =>
        this.logger.warn(`Cache write failed: ${(e as Error).message}`),
      );

      return stats;
    } catch (err) {
      this.logger.error(`getStats users failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve user statistics.');
    }
  }

  async findOneUser(id: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID '${id}' not found`);
      }

      const [totalBookings, totalTransactions, spentResult] = await Promise.all([
        this.bookingRepository.count({ where: { userId: id } }),
        this.transactionRepository.count({ where: { userId: id } }),
        this.transactionRepository
          .createQueryBuilder('txn')
          .select('COALESCE(SUM(txn.amount), 0)', 'totalSpent')
          .where('txn.userId = :userId', { userId: id })
          .andWhere('txn.status IN (:...statuses)', { statuses: [TransactionStatus.COMPLETED, TransactionStatus.PAID] })
          .getRawOne(),
      ]);

      const totalSpent = parseFloat(spentResult?.totalSpent || '0');

      return {
        ...user,
        stats: { totalBookings, totalTransactions, totalSpent },
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`findOneUser failed [id=${id}]: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve user details.');
    }
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const existing = await this.userRepository.findOne({
        where: { email: createUserDto.email.toLowerCase().trim() },
        withDeleted: true,
      });

      if (existing) {
        throw new ConflictException(`User with email '${createUserDto.email}' already exists`);
      }

      const defaultPassword = createUserDto.password || 'User@123';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const user = this.userRepository.create({
        ...createUserDto,
        email: createUserDto.email.toLowerCase().trim(),
        password: passwordHash,
      });

      const newUser = await this.userRepository.save(user);

      await this.redisService.invalidateUsers().catch((e) =>
        this.logger.warn(`Cache invalidation failed: ${(e as Error).message}`),
      );

      this.logger.log(`User created: ${newUser.email} (${newUser.role})`);
      return newUser;
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.error(`create user failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to create user.');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID '${id}' not found`);
      }

      if (updateUserDto.email && updateUserDto.email.toLowerCase().trim() !== user.email) {
        const emailConflict = await this.userRepository.findOne({
          where: { email: updateUserDto.email.toLowerCase().trim() },
        });
        if (emailConflict) {
          throw new ConflictException(`Email '${updateUserDto.email}' is already in use`);
        }
        user.email = updateUserDto.email.toLowerCase().trim();
      }

      if (updateUserDto.password) {
        user.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      if (updateUserDto.fullName !== undefined) user.fullName = updateUserDto.fullName;
      if (updateUserDto.role !== undefined) user.role = updateUserDto.role;
      if (updateUserDto.status !== undefined) user.status = updateUserDto.status;
      if (updateUserDto.phone !== undefined) user.phone = updateUserDto.phone;
      if (updateUserDto.department !== undefined) user.department = updateUserDto.department;
      if (updateUserDto.avatarUrl !== undefined) user.avatarUrl = updateUserDto.avatarUrl;

      const saved = await this.userRepository.save(user);

      await this.redisService.invalidateUsers().catch((e) =>
        this.logger.warn(`Cache invalidation failed: ${(e as Error).message}`),
      );

      this.logger.log(`User updated: ${id}`);
      return saved;
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof ConflictException) throw err;
      this.logger.error(`update user failed [id=${id}]: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to update user.');
    }
  }

  async remove(id: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID '${id}' not found`);
      }

      // Safeguard: Check if user has active/pending obligations
      const pendingBookings = await this.bookingRepository.count({
        where: { userId: id, status: BookingStatus.CONFIRMED as any },
      });

      if (pendingBookings > 0) {
        throw new BadRequestException('Cannot delete user with confirmed active bookings. Cancel or reschedule them first.');
      }

      await this.userRepository.softDelete(id);

      await this.redisService.invalidateUsers().catch((e) =>
        this.logger.warn(`Cache invalidation failed: ${(e as Error).message}`),
      );

      this.logger.log(`User soft-deleted: ${user.email} (${id})`);
      return { success: true, data: [], message: `User '${user.fullName}' has been deactivated/soft-deleted successfully` };
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      this.logger.error(`remove user failed [id=${id}]: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to delete user.');
    }
  }
}
