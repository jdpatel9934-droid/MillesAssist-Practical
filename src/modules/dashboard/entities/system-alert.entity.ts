import { AlertLevel } from '@/common/enums/alert-level.enum';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('system_alerts')
@Index('system_alerts_active_triggered_idx', ['isActive', 'triggeredAt'])
export class SystemAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string; // e.g., 'Server capacity at 92%'

  @Column({ length: 255 })
  message: string; // e.g., 'Scale resources'

  @Column({
    type: 'enum',
    enum: AlertLevel,
    default: AlertLevel.INFO,
  })
  @Index('system_alerts_level_idx')
  level: AlertLevel;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'action_label', nullable: true, length: 100 })
  actionLabel?: string;

  @Column({ name: 'action_url', nullable: true, length: 255 })
  actionUrl?: string;

  @Column({ name: 'triggered_at', type: 'timestamp with time zone' })
  triggeredAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
