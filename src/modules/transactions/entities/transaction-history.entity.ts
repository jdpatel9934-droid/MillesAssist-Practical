import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('transaction_histories')
@Index('tx_histories_txn_id_idx', ['transactionId', 'loggedAt'])
export class TransactionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ length: 150 })
  title: string; // e.g., 'Completed & Disbursed'

  @Column({ type: 'text' })
  description: string; // e.g., 'Settled in merchant bank account'

  @Column({ length: 50 })
  status: string;

  @Column({ name: 'logged_at', type: 'timestamp with time zone' })
  loggedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
