import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpsController } from './controllers/ops.controller';
import { OpsService } from './services/ops.service';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderStatusHistory } from '../orders/entities/order-status-history.entity';
import { StockCurrent } from '../orders/entities/stock-current.entity';
import { StockReservation } from '../orders/entities/stock-reservation.entity';
import { DriverAssignment } from '../orders/entities/driver-assignment.entity';
import { AdminGuard } from '../admin/auth/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusHistory,
      StockCurrent,
      StockReservation,
      DriverAssignment,
    ]),
  ],
  controllers: [OpsController],
  providers: [OpsService, AdminGuard],
})
export class OpsModule {}
