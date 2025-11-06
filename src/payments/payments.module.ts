import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MPController } from './controllers/mp.controller';
import { MPService } from './services/mp.service';
import { Payment } from './entities/payment.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, WebhookEvent, Order, OrderItem]),
  ],
  controllers: [MPController],
  providers: [MPService],
  exports: [MPService],
})
export class PaymentsModule {}
