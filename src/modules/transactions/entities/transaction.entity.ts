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
import { TransactionHistory } from './transaction-history.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';
import { TransactionStatus } from '../../../common/enums/transaction-status.enum';

@Entity('transactions')
@Index('transactions_status_created_idx', ['status', 'createdAt'])
@Index('transactions_user_created_idx', ['userId', 'createdAt'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reference_id', unique: true, length: 50 })
  @Index('transactions_ref_idx', { unique: true })
  referenceId: string; // e.g., TXN-1082

  @Column({ name: 'payment_reference', unique: true, length: 100 })
  @Index('transactions_payment_ref_idx', { unique: true })
  paymentReference: string; // e.g., REF-98342718

  @Column({ name: 'user_id', type: 'uuid' })
  @Index('transactions_user_id_idx')
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.PAYMENT,
  })
  @Index('transactions_type_idx')
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  @Index('transactions_status_idx')
  status: TransactionStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  fee: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0.0 })
  subtotal: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'payment_method', length: 100 })
  paymentMethod: string; // e.g., Credit Card (Visa ending in 4582)

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'settled_at', type: 'timestamp with time zone', nullable: true })
  settledAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  @Index('transactions_created_at_idx')
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => TransactionHistory, (history) => history.transaction, { cascade: true })
  history: TransactionHistory[];
}
