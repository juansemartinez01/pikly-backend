import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MPController } from './controllers/mp.controller';
import { MPService } from './services/mp.service';
import { Payment } from './entities/payment.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { AdminPaymentsService } from './services/admin-payments.service';
import { AdminPaymentsController } from './controllers/admin-payments.controller';
import { OrderStatusHistory } from 'src/orders/entities/order-status-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      WebhookEvent,
      Order,
      OrderItem,
      OrderStatusHistory,
    ]),
  ],
  controllers: [MPController, AdminPaymentsController],
  providers: [MPService, AdminPaymentsService],
  exports: [MPService, AdminPaymentsService],
})
export class PaymentsModule {}
