import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SystemAlert } from './entities/system-alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, Booking, SystemAlert])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule { }
