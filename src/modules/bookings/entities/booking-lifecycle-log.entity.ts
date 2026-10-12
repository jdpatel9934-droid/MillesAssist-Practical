import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';

@Entity('booking_lifecycle_logs')
@Index('booking_logs_bkg_id_idx', ['bookingId', 'loggedAt'])
export class BookingLifecycleLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, (booking) => booking.lifecycleLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ length: 150 })
  title: string; // e.g., 'Confirmation Sent', 'Status Set to Confirmed', 'Booking Created'

  @Column({ type: 'text' })
  description: string; // e.g., 'Outlook invite dispatched', 'Client self-service reservation'

  @Column({ length: 50 })
  status: string;

  @Column({ name: 'logged_at', type: 'timestamp with time zone' })
  loggedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
