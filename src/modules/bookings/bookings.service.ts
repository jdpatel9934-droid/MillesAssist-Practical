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
import { Booking } from './entities/booking.entity';
import { BookingLifecycleLog } from './entities/booking-lifecycle-log.entity';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingsDto, WhenStatus } from './dto/query-bookings.dto';
import { BookingPaymentStatus, BookingStatus } from '../../common/enums/booking-status.enum';
import { RedisService } from '../redis/redis.service';
import { DateFormatter } from '../../common/utils/date-formatter.util';
import { CurrencyFormatter } from '../../common/utils/currency-formatter.util';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingLifecycleLog)
    private readonly lifecycleLogRepository: Repository<BookingLifecycleLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) { }

  private applyFilters(qb: SelectQueryBuilder<Booking>, query: QueryBookingsDto): void {
    if (query.search && query.search.trim() !== '') {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(booking.referenceId ILIKE :search OR user.fullName ILIKE :search OR user.email ILIKE :search OR CAST(booking.serviceType AS text) ILIKE :search)',
        { search },
      );
    }

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }

    if (query.serviceType) {
      qb.andWhere('booking.serviceType = :serviceType', { serviceType: query.serviceType });
    }

    const now = new Date();
    if (query.when === WhenStatus.UPCOMING) {
      qb.andWhere('booking.scheduledDate >= :now', { now });
    } else if (query.when === WhenStatus.PAST) {
      qb.andWhere('booking.scheduledDate < :now', { now });
    }

    if (query.startDate && query.endDate) {
      qb.andWhere('booking.scheduledDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    } else if (query.startDate) {
      qb.andWhere('booking.scheduledDate >= :startDate', { startDate: new Date(query.startDate) });
    } else if (query.endDate) {
      qb.andWhere('booking.scheduledDate <= :endDate', { endDate: new Date(query.endDate) });
    }
  }

  private buildListCacheKey(query: QueryBookingsDto): string {
    const { page = 1, limit = 10, search = '', status = '', serviceType = '', when = '', sortBy = 'scheduledDate', sortOrder = 'DESC', startDate = '', endDate = '' } = query;
    return `bookings:list:${page}:${limit}:${search}:${status}:${serviceType}:${when}:${sortBy}:${sortOrder}:${startDate}:${endDate}`;
  }

  async findAll(query: QueryBookingsDto) {
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

      const qb = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.user', 'user')
        .leftJoinAndSelect('booking.transaction', 'transaction');

      this.applyFilters(qb, query);

      const validSortFields: Record<string, string> = {
        scheduledDate: 'booking.scheduledDate',
        createdAt: 'booking.createdAt',
        billingAmount: 'booking.billingAmount',
        durationHours: 'booking.durationHours',
        referenceId: 'booking.referenceId',
      };

      const sortColumn = validSortFields[query.sortBy || 'scheduledDate'] || 'booking.scheduledDate';
      const sortDirection = String(query.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      qb.orderBy(sortColumn, sortDirection).skip(skip).take(limit);

      const [bookings, total] = await qb.getManyAndCount();

      const formattedData = bookings.map((b) => ({
        id: b.id,
        bookingId: `#${b.referenceId}`,
        referenceId: b.referenceId,
        customer: b.user
          ? {
            id: b.user.id,
            name: b.user.fullName,
            email: b.user.email,
            avatarUrl: b.user.avatarUrl,
          }
          : null,
        service: b.serviceType,
        dateTime: DateFormatter.formatDateTime(b.scheduledDate),
        scheduledDate: b.scheduledDate,
        timeSlot: b.timeSlot,
        duration: `${b.durationHours} hrs`,
        durationHours: Number(b.durationHours),
        status: b.status,
        amount: Number(b.billingAmount),
        formattedAmount: CurrencyFormatter.format(b.billingAmount),
        paymentStatus: b.paymentStatus,
        meetingLocation: b.meetingLocation,
        createdAt: b.createdAt,
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
      this.logger.error(`findAll bookings failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve bookings. Please try again.');
    }
  }

  async getStats() {
    const cacheKey = 'bookings:stats';

    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    } catch (cacheErr) {
      this.logger.warn(`Cache read failed: ${(cacheErr as Error).message}`);
    }

    try {
      const [totalBookings, activeBookings, completedBookings, cancelledBookings] =
        await Promise.all([
          this.bookingRepository.count(),
          this.bookingRepository.count({ where: { status: BookingStatus.CONFIRMED } }),
          this.bookingRepository.count({ where: { status: BookingStatus.COMPLETED } }),
          this.bookingRepository.count({ where: { status: BookingStatus.CANCELLED } }),
        ]);

      const stats = { totalBookings, activeBookings, completedBookings, cancelledBookings };

      await this.redisService.set(cacheKey, stats, 60).catch((e) =>
        this.logger.warn(`Cache write failed: ${(e as Error).message}`),
      );

      return stats;
    } catch (err) {
      this.logger.error(`getStats bookings failed: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve booking statistics.');
    }
  }

  async findOne(id: string) {
    try {
      const booking = await this.bookingRepository.findOne({
        where: { id },
        relations: ['user', 'transaction', 'lifecycleLogs'],
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID '${id}' not found`);
      }

      // Sort lifecycle logs chronologically
      booking.lifecycleLogs = (booking.lifecycleLogs || []).sort(
        (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
      );

      // Fetch supporting stat in parallel (extend Promise.all if more are added)
      const [customerTotalCompletedBookings] = await Promise.all([
        this.bookingRepository.count({
          where: { userId: booking.userId, status: BookingStatus.COMPLETED },
        }),
      ]);

      return {
        id: booking.id,
        bookingId: `#${booking.referenceId}`,
        referenceId: booking.referenceId,
        status: booking.status,
        logistics: {
          serviceType: booking.serviceType,
          scheduledDate: DateFormatter.formatDate(booking.scheduledDate),
          meetingTimeSlot: booking.timeSlot,
          duration: `${booking.durationHours} hrs`,
          meetingLocation: booking.meetingLocation,
          clientSpecialNotes: booking.specialNotes || 'None provided',
        },
        paymentLedger: {
          billingAmount: Number(booking.billingAmount),
          formattedBillingAmount: CurrencyFormatter.format(booking.billingAmount),
          paymentStatus: booking.paymentStatus,
          invoiceLink: booking.transaction
            ? `#${booking.transaction.referenceId}`
            : `#INV-${booking.referenceId.replace('BKG-', '')}`,
          transactionId: booking.transactionId || null,
        },
        customerOverview: booking.user
          ? {
            id: booking.user.id,
            fullName: booking.user.fullName,
            email: booking.user.email,
            avatarUrl: booking.user.avatarUrl,
            totalBookingsCompleted: `${customerTotalCompletedBookings} Total Bookings Completed`,
          }
          : null,
        lifecycleLogs: booking.lifecycleLogs.map((log) => ({
          id: log.id,
          title: log.title,
          description: log.description,
          status: log.status,
          loggedAt: DateFormatter.formatDateTime(log.loggedAt),
          rawLoggedAt: log.loggedAt,
        })),
        scheduledDateRaw: booking.scheduledDate,
        createdAt: booking.createdAt,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`findOne booking failed [id=${id}]: ${(err as Error).message}`, (err as Error).stack);
      throw new InternalServerErrorException('Failed to retrieve booking details.');
    }
  }

  async create(createDto: CreateBookingDto) {
    const user = await this.userRepository.findOne({ where: { id: createDto.userId } });

    if (!user) {
      throw new NotFoundException(`Customer with ID '${createDto.userId}' not found`);
    }

    const referenceId = `BKG-${Math.floor(Math.random() * 8999 + 1000)}`;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = queryRunner.manager.create(Booking, {
        referenceId,
        userId: user.id,
        serviceType: createDto.serviceType,
        scheduledDate: new Date(createDto.scheduledDate),
        timeSlot: createDto.timeSlot,
        durationHours: createDto.durationHours || 1.0,
        meetingLocation: createDto.meetingLocation || 'Virtual - Zoom Link Provided',
        billingAmount: createDto.billingAmount || 0.0,
        specialNotes: createDto.specialNotes,
      });

      const savedBooking = await queryRunner.manager.save(booking);

      const logs = [
        queryRunner.manager.create(BookingLifecycleLog, {
          bookingId: savedBooking.id,
          title: 'Booking Created',
          description: 'Client self-service reservation',
          status: 'Created',
          loggedAt: new Date(),
        }),
        queryRunner.manager.create(BookingLifecycleLog, {
          bookingId: savedBooking.id,
          title: 'Status Set to Confirmed',
          description: 'Consultant assigned automatically',
          status: 'Confirmed',
          loggedAt: new Date(),
        }),
        queryRunner.manager.create(BookingLifecycleLog, {
          bookingId: savedBooking.id,
          title: 'Confirmation Sent',
          description: 'Outlook invite dispatched with calendar details',
          status: 'Confirmed',
          loggedAt: new Date(),
        }),
      ];

      await queryRunner.manager.save(logs);
      await queryRunner.commitTransaction();

      await this.redisService.invalidateBookings().catch((e) =>
        this.logger.warn(`Cache invalidation failed: ${(e as Error).message}`),
      );

      this.logger.log(`Booking created: ${referenceId} for user ${user.email}`);
      return this.findOne(savedBooking.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Booking creation failed: ${(err as Error).message}`, (err as Error).stack);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to create booking. Transaction rolled back.');
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, updateDto: UpdateBookingDto) {
    const booking = await this.bookingRepository.findOne({ where: { id } });

    if (!booking) {
      throw new NotFoundException(`Booking with ID '${id}' not found`);
    }

    if (booking.status === BookingStatus.COMPLETED && updateDto.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot cancel a booking that is already completed.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const prevDate = booking.scheduledDate;

      if (updateDto.status !== undefined) booking.status = updateDto.status;
      if (updateDto.serviceType !== undefined) booking.serviceType = updateDto.serviceType;
      if (updateDto.timeSlot !== undefined) booking.timeSlot = updateDto.timeSlot;
      if (updateDto.durationHours !== undefined) booking.durationHours = updateDto.durationHours;
      if (updateDto.meetingLocation !== undefined) booking.meetingLocation = updateDto.meetingLocation;
      if (updateDto.billingAmount !== undefined) booking.billingAmount = updateDto.billingAmount;
      if (updateDto.paymentStatus !== undefined) booking.paymentStatus = updateDto.paymentStatus;
      if (updateDto.specialNotes !== undefined) booking.specialNotes = updateDto.specialNotes;

      let logTitle = 'Booking Updated';
      let logDesc = updateDto.auditNote || 'Booking parameters updated';

      if (updateDto.scheduledDate) {
        booking.scheduledDate = new Date(updateDto.scheduledDate);
        logTitle = 'Booking Rescheduled';
        logDesc =
          updateDto.auditNote ||
          `Rescheduled from ${DateFormatter.formatDate(prevDate)} to ${DateFormatter.formatDate(booking.scheduledDate)}`;
      }

      if (updateDto.status === BookingStatus.CANCELLED) {
        booking.cancelledAt = new Date();
        booking.paymentStatus = BookingPaymentStatus.REFUNDED;
        logTitle = 'Booking Cancelled';
        logDesc = updateDto.auditNote || 'Booking session cancelled by administrator';
      }

      await queryRunner.manager.save(booking);

      const lifecycleLog = queryRunner.manager.create(BookingLifecycleLog, {
        bookingId: booking.id,
        title: logTitle,
        description: logDesc,
        status: booking.status,
        loggedAt: new Date(),
      });

      await queryRunner.manager.save(lifecycleLog);
      await queryRunner.commitTransaction();

      await this.redisService.invalidateBookings().catch((e) =>
        this.logger.warn(`Cache invalidation failed: ${(e as Error).message}`),
      );

      this.logger.log(`Booking updated: ${id} — ${logTitle}`);
      return this.findOne(booking.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Booking update failed [id=${id}]: ${(err as Error).message}`, (err as Error).stack);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to update booking. Transaction rolled back.');
    } finally {
      await queryRunner.release();
    }
  }

  async exportCsvStream(query: QueryBookingsDto) {
    try {
      const qb = this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.user', 'user');

      this.applyFilters(qb, query);
      qb.orderBy('booking.scheduledDate', 'DESC');

      const bookings = await qb.getMany();

      const stringifier = stringify({
        header: true,
        columns: [
          { key: 'bookingId', header: 'Booking ID' },
          { key: 'customer', header: 'Customer' },
          { key: 'customerEmail', header: 'Customer Email' },
          { key: 'service', header: 'Service Type' },
          { key: 'scheduledDate', header: 'Scheduled Date' },
          { key: 'timeSlot', header: 'Time Slot' },
          { key: 'duration', header: 'Duration' },
          { key: 'status', header: 'Status' },
          { key: 'billingAmount', header: 'Billing Amount (USD)' },
          { key: 'paymentStatus', header: 'Payment Status' },
          { key: 'location', header: 'Location' },
        ],
      });

      for (const b of bookings) {
        stringifier.write({
          bookingId: `#${b.referenceId}`,
          customer: b.user ? b.user.fullName : 'N/A',
          customerEmail: b.user ? b.user.email : 'N/A',
          service: b.serviceType,
          scheduledDate: DateFormatter.formatDateTime(b.scheduledDate),
          timeSlot: b.timeSlot,
          duration: `${b.durationHours} hrs`,
          status: b.status,
          billingAmount: Number(b.billingAmount).toFixed(2),
          paymentStatus: b.paymentStatus,
          location: b.meetingLocation,
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
