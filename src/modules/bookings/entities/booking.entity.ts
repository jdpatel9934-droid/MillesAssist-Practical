import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { BookingLifecycleLog } from './booking-lifecycle-log.entity';
import { BookingPaymentStatus, BookingStatus } from '../../../common/enums/booking-status.enum';

@Entity('bookings')
@Index('bookings_status_sched_idx', ['status', 'scheduledDate'])
@Index('bookings_user_created_idx', ['userId', 'createdAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reference_id', unique: true, length: 50 })
  @Index('bookings_ref_idx', { unique: true })
  referenceId: string; // e.g., BKG-2341

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('bookings_user_id_idx')
  userId: string;

  @ManyToOne(() => User, (user) => user.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  @Index('bookings_transaction_id_idx')
  transactionId?: string;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transaction_id' })
  transaction?: Transaction;

  @Column({
    name: 'service_type',
  })
  @Index('bookings_service_type_idx')
  serviceType: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  @Index('bookings_status_idx')
  status: BookingStatus;

  @Column({ name: 'scheduled_date', type: 'timestamp with time zone' })
  @Index('bookings_scheduled_date_idx')
  scheduledDate: Date;

  @Column({ name: 'time_slot', length: 100 })
  timeSlot: string; // e.g., '2:00 PM - 3:30 PM (EST)'

  @Column({ name: 'duration_hours', type: 'numeric', precision: 3, scale: 1, default: 1.0 })
  durationHours: number; // e.g., 1.5

  @Column({ name: 'meeting_location', length: 255, default: 'Virtual - Zoom Link Provided' })
  meetingLocation: string;

  @Column({ name: 'billing_amount', type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  billingAmount: number;

  // @Column({ name: 'payment_status', length: 50, default: 'Pending' })
  // paymentStatus: string; // e.g., 'Paid', 'Pending'

  @Column({
    type: 'enum',
    enum: BookingPaymentStatus,
    default: BookingPaymentStatus.PENDING,
  })
  @Index('bookings_status_idx')
  paymentStatus: BookingPaymentStatus;

  @Column({ name: 'special_notes', type: 'text', nullable: true })
  specialNotes?: string;

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @Index('bookings_created_at_idx')
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => BookingLifecycleLog, (log) => log.booking, { cascade: true })
  lifecycleLogs: BookingLifecycleLog[];
}
