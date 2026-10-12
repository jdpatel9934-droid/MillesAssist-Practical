import * as bcrypt from 'bcrypt';
import AppDataSource from '../../config/typeorm.config';
import { User } from '../../modules/users/entities/user.entity';
import { Transaction } from '../../modules/transactions/entities/transaction.entity';
import { TransactionHistory } from '../../modules/transactions/entities/transaction-history.entity';
import { Booking } from '../../modules/bookings/entities/booking.entity';
import { BookingLifecycleLog } from '../../modules/bookings/entities/booking-lifecycle-log.entity';
import { SystemAlert } from '../../modules/dashboard/entities/system-alert.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../common/enums/transaction-status.enum';
import { BookingPaymentStatus, BookingStatus } from '../../common/enums/booking-status.enum';
import { AlertLevel } from '../../common/enums/alert-level.enum';

export async function runSeed() {
  console.log('🌱 Starting deterministic database seeding for AdminHub...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    console.log('🧹 Cleaning existing evaluation data...');
    await queryRunner.query('TRUNCATE TABLE "booking_lifecycle_logs", "bookings", "transaction_histories", "transactions", "system_alerts", "users" CASCADE;');

    const passwordHash = await bcrypt.hash('admin@123', 10);
    const userPasswordHash = await bcrypt.hash('user@123', 10);

    const now = new Date();
    // Anchor current date for consistent demonstration: 2026-10-01 (as seen in Figma screen: "Wednesday, September 30, 2026" / "October 1, 2026")
    const anchorDate = new Date('2026-10-01T10:00:00.000Z');

    // 1. Seed Seeded Admin User (Sarah Jenkins)
    console.log('👤 Seeding Super Administrator (Sarah Jenkins)...');
    const adminUser = AppDataSource.getRepository(User).create({
      fullName: 'Sarah Jenkins',
      email: 'admin@adminhub.com',
      password: passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      department: 'Executive Management',
      phone: '+1 (555) 019-2834',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      lastLoginAt: anchorDate,
      createdAt: new Date('2025-01-15T08:00:00.000Z'),
    });
    await AppDataSource.getRepository(User).save(adminUser);

    // 2. Seed Directory Users from Figma and Frontend
    console.log('👥 Seeding directory users...');
    const usersData = [
      {
        fullName: 'Albert Flores',
        email: 'albert.flores@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 234-5678',
        department: 'Finance',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        createdAt: new Date('2026-06-15T09:00:00.000Z'),
      },
      {
        fullName: 'Sarah Johnson',
        email: 'sarah.johnson@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 345-6789',
        department: 'Operations',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: new Date('2026-05-10T11:00:00.000Z'),
      },
      {
        fullName: 'Michael Brown',
        email: 'michael.brown@example.com',
        role: UserRole.EDITOR,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 456-7890',
        department: 'IT',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        createdAt: new Date('2026-07-20T14:30:00.000Z'),
      },
      {
        fullName: 'Emily Davis',
        email: 'emily.davis@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 567-8901',
        department: 'Marketing',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        createdAt: new Date('2026-08-01T10:15:00.000Z'),
      },
      {
        fullName: 'David Wilson',
        email: 'david.wilson@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.SUSPENDED,
        phone: '+1 (555) 678-9012',
        department: 'Sales',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        createdAt: new Date('2026-04-18T16:45:00.000Z'),
      },
      {
        fullName: 'Emma Jones',
        email: 'emma.jones@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 789-0123',
        department: 'Consulting',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
        createdAt: new Date('2026-08-12T08:30:00.000Z'),
      },
      {
        fullName: 'Robert Taylor',
        email: 'robert.taylor@example.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 890-1234',
        department: 'Management',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        createdAt: new Date('2026-03-05T12:00:00.000Z'),
      },
      {
        fullName: 'Clara Martin',
        email: 'clara.martin@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.INACTIVE,
        phone: '+1 (555) 901-2345',
        department: 'HR',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        createdAt: new Date('2026-07-08T15:20:00.000Z'),
      },
      {
        fullName: 'Joseph Thomas',
        email: 'joseph.thomas@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 012-3456',
        department: 'Finance',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        createdAt: new Date('2026-08-25T11:10:00.000Z'),
      },
      {
        fullName: 'Guy Hawkins',
        email: 'guy.hawkins@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 123-4567',
        department: 'Logistics',
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        createdAt: new Date('2026-09-02T13:40:00.000Z'),
      },
      {
        fullName: 'Esther Howard',
        email: 'esther.howard@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 234-5670',
        department: 'Engineering',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        createdAt: new Date('2026-09-10T10:00:00.000Z'),
      },
      {
        fullName: 'Jenny Wilson',
        email: 'jenny.wilson@example.com',
        role: UserRole.VIEWER,
        status: UserStatus.ACTIVE,
        phone: '+1 (555) 345-6781',
        department: 'Design',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: new Date('2026-09-15T09:20:00.000Z'),
      },
    ];

    const userEntities: User[] = [];
    for (const u of usersData) {
      const entity = AppDataSource.getRepository(User).create({
        ...u,
        password: userPasswordHash,
      });
      userEntities.push(await AppDataSource.getRepository(User).save(entity));
    }

    // Additional generic users to demonstrate large pagination and realistic metrics
    for (let i = 13; i <= 60; i++) {
      const genericUser = AppDataSource.getRepository(User).create({
        fullName: `User ${i} Sample`,
        email: `user${i}@example.com`,
        password: userPasswordHash,
        role: i % 5 === 0 ? UserRole.EDITOR : i % 7 === 0 ? UserRole.VIEWER : UserRole.VIEWER,
        status: i % 11 === 0 ? UserStatus.INACTIVE : i % 19 === 0 ? UserStatus.SUSPENDED : UserStatus.ACTIVE,
        department: ['Engineering', 'Marketing', 'Sales', 'Design', 'Finance'][i % 5],
        createdAt: new Date(anchorDate.getTime() - i * 4 * 86400000),
      });
      await AppDataSource.getRepository(User).save(genericUser);
    }

    // Map specific users for transactions & bookings
    const albertFlores = userEntities.find((u) => u.fullName === 'Albert Flores')!;
    const sarahJohnson = userEntities.find((u) => u.fullName === 'Sarah Johnson')!;
    const michaelBrown = userEntities.find((u) => u.fullName === 'Michael Brown')!;
    const emilyDavis = userEntities.find((u) => u.fullName === 'Emily Davis')!;
    const davidWilson = userEntities.find((u) => u.fullName === 'David Wilson')!;
    const emmaJones = userEntities.find((u) => u.fullName === 'Emma Jones')!;
    const robertTaylor = userEntities.find((u) => u.fullName === 'Robert Taylor')!;
    const claraMartin = userEntities.find((u) => u.fullName === 'Clara Martin')!;
    const josephThomas = userEntities.find((u) => u.fullName === 'Joseph Thomas')!;
    const guyHawkins = userEntities.find((u) => u.fullName === 'Guy Hawkins')!;
    const estherHoward = userEntities.find((u) => u.fullName === 'Esther Howard')!;
    const jennyWilson = userEntities.find((u) => u.fullName === 'Jenny Wilson')!;

    // 3. Seed Transactions
    console.log('💳 Seeding transactions and audit processing history...');
    // Exact Figma Screen 2 transaction: #TXN-1082 ($150.00, subtotal 145.10, fee 4.90, Sep 27, 2026)
    const txn1082 = await AppDataSource.getRepository(Transaction).save(
      AppDataSource.getRepository(Transaction).create({
        referenceId: 'TXN-1082',
        paymentReference: 'REF-98342718',
        userId: albertFlores.id,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PAID,
        amount: 150.0,
        fee: 4.9,
        subtotal: 145.1,
        currency: 'USD',
        paymentMethod: 'Credit Card (Visa ending in 4582)',
        notes: 'Executive consultation service fee payment',
        settledAt: new Date('2026-09-27T11:32:00.000Z'),
        createdAt: new Date('2026-09-27T11:28:00.000Z'),
      }),
    );

    // Processing History for TXN-1082 (Matching Figma Screen 2 timeline)
    await AppDataSource.getRepository(TransactionHistory).save([
      AppDataSource.getRepository(TransactionHistory).create({
        transactionId: txn1082.id,
        title: 'Completed & Disbursed',
        description: 'Settled in merchant bank account',
        status: 'Completed',
        loggedAt: new Date('2026-09-27T11:32:00.000Z'),
      }),
      AppDataSource.getRepository(TransactionHistory).create({
        transactionId: txn1082.id,
        title: 'Processing & Authorized',
        description: 'Visa Gateway auth approved',
        status: 'Authorized',
        loggedAt: new Date('2026-09-27T11:30:00.000Z'),
      }),
      AppDataSource.getRepository(TransactionHistory).create({
        transactionId: txn1082.id,
        title: 'Initiated',
        description: 'Checkout session initialized',
        status: 'Initiated',
        loggedAt: new Date('2026-09-27T11:28:00.000Z'),
      }),
    ]);

    // Related Ledger Entries for Albert Flores (from Figma Screen 2)
    const txn7102 = await AppDataSource.getRepository(Transaction).save(
      AppDataSource.getRepository(Transaction).create({
        referenceId: 'TXN-7102',
        paymentReference: 'REF-83719203',
        userId: albertFlores.id,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        amount: 120.0,
        fee: 3.8,
        subtotal: 116.2,
        currency: 'USD',
        paymentMethod: 'Visa Card (*4582)',
        settledAt: new Date('2026-08-15T10:14:00.000Z'),
        createdAt: new Date('2026-08-15T10:10:00.000Z'),
      }),
    );

    const txn5921 = await AppDataSource.getRepository(Transaction).save(
      AppDataSource.getRepository(Transaction).create({
        referenceId: 'TXN-5921',
        paymentReference: 'REF-55910248',
        userId: albertFlores.id,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        amount: 350.0,
        fee: 10.5,
        subtotal: 339.5,
        currency: 'USD',
        paymentMethod: 'Direct PayPal Link',
        settledAt: new Date('2026-07-02T16:50:00.000Z'),
        createdAt: new Date('2026-07-02T16:45:00.000Z'),
      }),
    );

    // Recent Transactions shown in Figma Screen 4
    await AppDataSource.getRepository(Transaction).save([
      AppDataSource.getRepository(Transaction).create({
        referenceId: 'TXN-1081',
        paymentReference: 'REF-98342719',
        userId: jennyWilson.id,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PENDING,
        amount: 2350.0,
        fee: 68.15,
        subtotal: 2281.85,
        currency: 'USD',
        paymentMethod: 'Bank Wire Transfer',
        createdAt: new Date('2026-09-30T15:20:00.000Z'),
      }),
      AppDataSource.getRepository(Transaction).create({
        referenceId: 'TXN-1079',
        paymentReference: 'REF-98342717',
        userId: guyHawkins.id,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.FAILED,
        amount: 85.0,
        fee: 2.75,
        subtotal: 82.25,
        currency: 'USD',
        paymentMethod: 'Mastercard ending in 1928',
        createdAt: new Date('2026-09-28T09:15:00.000Z'),
      }),
      AppDataSource.getRepository(Transaction).create({
        referenceId: 'TXN-1078',
        paymentReference: 'REF-98342716',
        userId: estherHoward.id,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        amount: 1200.0,
        fee: 34.8,
        subtotal: 1165.2,
        currency: 'USD',
        paymentMethod: 'Visa ending in 8831',
        settledAt: new Date('2026-09-27T14:10:00.000Z'),
        createdAt: new Date('2026-09-27T14:05:00.000Z'),
      }),
    ]);

    // Seed realistic transaction dataset over previous 12 months for Revenue charts (Apr - Sep 2026)
    const monthlyRevenues = [
      { month: 3, year: 2026, total: 60000 },  // Apr
      { month: 4, year: 2026, total: 145000 }, // May
      { month: 5, year: 2026, total: 110000 }, // Jun
      { month: 6, year: 2026, total: 275000 }, // Jul
      { month: 7, year: 2026, total: 200000 }, // Aug
      { month: 8, year: 2026, total: 340000 }, // Sep
    ];

    let txCounter = 2000;
    for (const m of monthlyRevenues) {
      const itemsCount = 20;
      const avgAmount = m.total / itemsCount;
      for (let j = 0; j < itemsCount; j++) {
        txCounter++;
        const randomUser = userEntities[j % userEntities.length];
        const date = new Date(Date.UTC(m.year, m.month, 1 + (j * 28) / itemsCount, 10, 0, 0));
        await AppDataSource.getRepository(Transaction).save(
          AppDataSource.getRepository(Transaction).create({
            referenceId: `TXN-${txCounter}`,
            paymentReference: `REF-${80000000 + txCounter}`,
            userId: randomUser.id,
            type: j % 6 === 0 ? TransactionType.REFUND : TransactionType.PAYMENT,
            status: j % 8 === 0 ? TransactionStatus.PENDING : j % 12 === 0 ? TransactionStatus.FAILED : TransactionStatus.COMPLETED,
            amount: parseFloat((avgAmount * (0.8 + Math.random() * 0.4)).toFixed(2)),
            fee: parseFloat((avgAmount * 0.029).toFixed(2)),
            subtotal: parseFloat((avgAmount * 0.971).toFixed(2)),
            currency: 'USD',
            paymentMethod: j % 2 === 0 ? 'Credit Card (Visa)' : 'PayPal Direct',
            settledAt: date,
            createdAt: date,
          }),
        );
      }
    }

    // 4. Seed Bookings from Figma Screen 1 & 3
    console.log('📅 Seeding bookings and lifecycle logs...');
    // Exact Figma Screen 1 booking: #BKG-2341 (Sarah Johnson, Business Consultation, Oct 15, 2026 14:00, 1.5 hrs, $180)
    const bkg2341 = await AppDataSource.getRepository(Booking).save(
      AppDataSource.getRepository(Booking).create({
        referenceId: 'BKG-2341',
        userId: sarahJohnson.id,
        transactionId: txn1082.id,
        serviceType: "Test Service",
        status: BookingStatus.CONFIRMED,
        scheduledDate: new Date('2026-10-15T14:00:00.000Z'),
        timeSlot: '2:00 PM - 3:30 PM (EST)',
        durationHours: 1.5,
        meetingLocation: 'Virtual - Zoom Link Provided',
        billingAmount: 180.0,
        paymentStatus: BookingPaymentStatus.PAID,
        specialNotes: 'Need assistance with expanding our payment gateway options and preparing our database backup plans.',
        createdAt: new Date('2026-10-12T09:28:00.000Z'),
      }),
    );

    // Lifecycle Logs for BKG-2341 (Matching Figma Screen 1)
    await AppDataSource.getRepository(BookingLifecycleLog).save([
      AppDataSource.getRepository(BookingLifecycleLog).create({
        bookingId: bkg2341.id,
        title: 'Confirmation Sent',
        description: 'Outlook invite dispatched',
        status: 'Confirmed',
        loggedAt: new Date('2026-10-12T10:00:00.000Z'),
      }),
      AppDataSource.getRepository(BookingLifecycleLog).create({
        bookingId: bkg2341.id,
        title: 'Status Set to Confirmed',
        description: 'Consultant assigned automatically',
        status: 'Confirmed',
        loggedAt: new Date('2026-10-12T09:30:00.000Z'),
      }),
      AppDataSource.getRepository(BookingLifecycleLog).create({
        bookingId: bkg2341.id,
        title: 'Booking Created',
        description: 'Client self-service reservation',
        status: 'Created',
        loggedAt: new Date('2026-10-12T09:28:00.000Z'),
      }),
    ]);

    // Bookings from Table in Figma Screen 3
    const directoryBookings = [
      {
        referenceId: 'BKG-2340',
        user: michaelBrown,
        serviceType: "Test Service 1",
        status: BookingStatus.COMPLETED,
        scheduledDate: new Date('2026-10-14T10:00:00.000Z'),
        timeSlot: '10:00 AM - 11:00 AM (EST)',
        durationHours: 1.0,
        billingAmount: 120.0,
        paymentStatus: BookingPaymentStatus.PAID,
        createdAt: new Date('2026-10-10T08:00:00.000Z'),
      },
      {
        referenceId: 'BKG-2339',
        user: emilyDavis,
        serviceType: "Test Service 2",
        status: BookingStatus.PENDING,
        scheduledDate: new Date('2026-10-13T16:30:00.000Z'),
        timeSlot: '4:30 PM - 6:30 PM (EST)',
        durationHours: 2.0,
        billingAmount: 250.0,
        paymentStatus: BookingPaymentStatus.PENDING,
        createdAt: new Date('2026-10-09T14:00:00.000Z'),
      },
      {
        referenceId: 'BKG-2338',
        user: davidWilson,
        serviceType: "Test Service 1",
        status: BookingStatus.CANCELLED,
        scheduledDate: new Date('2026-10-12T11:30:00.000Z'),
        timeSlot: '11:30 AM - 1:00 PM (EST)',
        durationHours: 1.5,
        billingAmount: 180.0,
        paymentStatus: BookingPaymentStatus.REFUNDED,
        cancelledAt: new Date('2026-10-11T12:00:00.000Z'),
        createdAt: new Date('2026-10-08T11:00:00.000Z'),
      },
      {
        referenceId: 'BKG-2337',
        user: emmaJones,
        serviceType: "Test Service 1",
        status: BookingStatus.COMPLETED,
        scheduledDate: new Date('2026-10-11T09:00:00.000Z'),
        timeSlot: '9:00 AM - 10:00 AM (EST)',
        durationHours: 1.0,
        billingAmount: 95.0,
        paymentStatus: BookingPaymentStatus.PAID,
        createdAt: new Date('2026-10-07T09:00:00.000Z'),
      },
      {
        referenceId: 'BKG-2336',
        user: robertTaylor,
        serviceType: "Test Service 1",
        status: BookingStatus.CONFIRMED,
        scheduledDate: new Date('2026-10-10T15:00:00.000Z'),
        timeSlot: '3:00 PM - 4:30 PM (EST)',
        durationHours: 1.5,
        billingAmount: 180.0,
        paymentStatus: BookingPaymentStatus.PAID,
        createdAt: new Date('2026-10-06T15:00:00.000Z'),
      },
      {
        referenceId: 'BKG-2335',
        user: claraMartin,
        serviceType: "Test Service 1",
        status: BookingStatus.COMPLETED,
        scheduledDate: new Date('2026-10-09T13:00:00.000Z'),
        timeSlot: '1:00 PM - 2:00 PM (EST)',
        durationHours: 1.0,
        billingAmount: 120.0,
        paymentStatus: BookingPaymentStatus.PAID,
        createdAt: new Date('2026-10-05T13:00:00.000Z'),
      },
      {
        referenceId: 'BKG-2334',
        user: josephThomas,
        serviceType: "Test Service 1",
        status: BookingStatus.CONFIRMED,
        scheduledDate: new Date('2026-10-08T10:30:00.000Z'),
        timeSlot: '10:30 AM - 12:30 PM (EST)',
        durationHours: 2.0,
        billingAmount: 250.0,
        paymentStatus: BookingPaymentStatus.PAID,
        createdAt: new Date('2026-10-04T10:00:00.000Z'),
      },
    ];

    for (const b of directoryBookings) {
      const savedBooking = await AppDataSource.getRepository(Booking).save(
        AppDataSource.getRepository(Booking).create({
          referenceId: b.referenceId,
          userId: b.user.id,
          serviceType: b.serviceType,
          status: b.status,
          scheduledDate: b.scheduledDate,
          timeSlot: b.timeSlot,
          durationHours: b.durationHours,
          meetingLocation: 'Virtual - Zoom Link Provided',
          billingAmount: b.billingAmount,
          paymentStatus: b.paymentStatus,
          cancelledAt: b.cancelledAt,
          createdAt: b.createdAt,
        }),
      );

      await AppDataSource.getRepository(BookingLifecycleLog).save(
        AppDataSource.getRepository(BookingLifecycleLog).create({
          bookingId: savedBooking.id,
          title: `Status Set to ${b.status}`,
          description: `Booking updated to ${b.status} automatically`,
          status: b.status,
          loggedAt: b.createdAt,
        }),
      );
    }

    // Additional generic bookings for realistic metric calculations
    for (let i = 1; i <= 40; i++) {
      const user = userEntities[i % userEntities.length];
      const status = i % 4 === 0 ? BookingStatus.CANCELLED : i % 3 === 0 ? BookingStatus.COMPLETED : BookingStatus.CONFIRMED;
      const bkg = await AppDataSource.getRepository(Booking).save(
        AppDataSource.getRepository(Booking).create({
          referenceId: `BKG-${2400 + i}`,
          userId: user.id,
          serviceType: "Test Service 1",
          status,
          scheduledDate: new Date(anchorDate.getTime() + (i - 20) * 86400000),
          timeSlot: '2:00 PM - 3:00 PM (EST)',
          durationHours: 1.0,
          meetingLocation: 'Virtual - Zoom Link Provided',
          billingAmount: 150.0,
          paymentStatus: status === BookingStatus.CANCELLED ? BookingPaymentStatus.REFUNDED : BookingPaymentStatus.PAID,
          createdAt: new Date(anchorDate.getTime() - i * 86400000),
        }),
      );
      await AppDataSource.getRepository(BookingLifecycleLog).save(
        AppDataSource.getRepository(BookingLifecycleLog).create({
          bookingId: bkg.id,
          title: 'Booking Created',
          description: 'Client reservation registered',
          status: 'Created',
          loggedAt: bkg.createdAt,
        }),
      );
    }

    // 5. Seed System Alerts from Figma Screen 4
    console.log('🚨 Seeding system alerts...');
    await AppDataSource.getRepository(SystemAlert).save([
      AppDataSource.getRepository(SystemAlert).create({
        title: 'Server capacity at 92%',
        message: 'Scale resources',
        level: AlertLevel.ERROR,
        isActive: true,
        actionLabel: 'Scale Now',
        actionUrl: '/settings/resources',
        triggeredAt: new Date(anchorDate.getTime() - 2 * 3600000), // 2 hours ago
      }),
      AppDataSource.getRepository(SystemAlert).create({
        title: '15 transactions pending',
        message: 'Pending review',
        level: AlertLevel.WARNING,
        isActive: true,
        actionLabel: 'Review',
        actionUrl: '/transactions?status=PENDING',
        triggeredAt: new Date(anchorDate.getTime() - 5 * 3600000), // 5 hours ago
      }),
      AppDataSource.getRepository(SystemAlert).create({
        title: 'System maintenance scheduled',
        message: 'Scheduled for Oct 5',
        level: AlertLevel.INFO,
        isActive: true,
        actionLabel: 'Details',
        actionUrl: '/announcements/maintenance',
        triggeredAt: new Date(anchorDate.getTime() - 24 * 3600000), // Yesterday
      }),
    ]);

    console.log('🎉 Seed completed successfully!');
    console.log('🔑 Seeded Administrator Credentials:');
    console.log('   Email:    admin@adminhub.com');
    console.log('   Password: AdminPassword123!');
    console.log('   Role:     SUPER_ADMIN');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
