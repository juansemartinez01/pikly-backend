import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatusHistory } from '../../orders/entities/order-status-history.entity';
import { ListPaymentsDto } from '../dto/list-payments.dto';
import { ManualUpdatePaymentDto } from '../dto/manual-update-payment.dto';

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private readonly histRepo: Repository<OrderStatusHistory>,
    private readonly ds: DataSource,
  ) {}

  // LISTA DE PAGOS (con datos básicos de la orden)
  async list(dto: ListPaymentsDto) {
    const page = Math.max(1, Number(dto.page || 1));
    const limit = Math.min(100, Math.max(1, Number(dto.limit || 20)));
    const skip = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoin('p.order', 'o')
      .select([
        'p.id AS id',
        'p.provider AS provider',
        'p.provider_payment_id AS "providerPaymentId"',
        'p.status AS status',
        'p.amount AS amount',
        'p.approved_at AS "approvedAt"',
        'p.created_at AS "createdAt"',
        'o.id AS "orderId"',
        'o.order_number AS "orderNumber"',
        'o.payment_status AS "orderPaymentStatus"',
        'o.status AS "orderStatus"',
        'o.total AS "orderTotal"',
      ]);

    if (dto.orderNumber) {
      qb.andWhere('o.order_number ILIKE :on', {
        on: `%${dto.orderNumber}%`,
      });
    }
    if (dto.provider) {
      qb.andWhere('p.provider = :prov', { prov: dto.provider });
    }
    if (dto.status) {
      qb.andWhere('p.status = :st', { st: dto.status });
    }

    const rows = await qb
      .orderBy('p.created_at', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    const countQb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoin('p.order', 'o');

    if (dto.orderNumber) {
      countQb.andWhere('o.order_number ILIKE :on', {
        on: `%${dto.orderNumber}%`,
      });
    }
    if (dto.provider) {
      countQb.andWhere('p.provider = :prov', { prov: dto.provider });
    }
    if (dto.status) {
      countQb.andWhere('p.status = :st', { st: dto.status });
    }

    const total = await countQb.getCount();

    return {
      page,
      limit,
      total,
      items: rows.map((r) => ({
        id: r.id,
        provider: r.provider,
        providerPaymentId: r.providerPaymentId,
        status: r.status,
        amount: Number(r.amount),
        approvedAt: r.approvedAt,
        createdAt: r.createdAt,
        order: {
          id: r.orderId,
          orderNumber: r.orderNumber,
          paymentStatus: r.orderPaymentStatus,
          status: r.orderStatus,
          total: Number(r.orderTotal),
        },
      })),
    };
  }

  // TODOS LOS PAGOS DE UNA ORDEN + resumen
  async paymentsForOrder(orderNumber: string) {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const payments = await this.paymentRepo.find({
      where: { order: { id: order.id } },
      order: { createdAt: 'DESC' },
    });

    return {
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      payments: payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        providerPaymentId: p.providerPaymentId,
        status: p.status,
        amount: Number(p.amount),
        approvedAt: p.approvedAt,
        createdAt: p.createdAt,
      })),
    };
  }

  // CAMBIO MANUAL DE ESTADO DE PAGO / ORDEN + REGISTRO DE PAGO MANUAL OPCIONAL
  async manualUpdate(orderNumber: string, dto: ManualUpdatePaymentDto) {
    return this.ds.transaction(async (m) => {
      const orderRepo = m.getRepository(Order);
      const paymentRepo = m.getRepository(Payment);
      const histRepo = m.getRepository(OrderStatusHistory);

      const order = await orderRepo.findOne({
        where: { orderNumber },
      });
      if (!order) {
        throw new NotFoundException('Orden no encontrada');
      }

      const prevOrderStatus = order.status;
      const prevPaymentStatus = order.paymentStatus;

      // 1) Actualizar estado de pago de la orden
      order.paymentStatus = dto.paymentStatus;

      // 2) Opcional: actualizar estado operativo de la orden (override manual)
      if (dto.orderStatus) {
        order.status = dto.orderStatus;
      }

      await orderRepo.save(order);

      // 3) Registrar pago manual (si se envía provider/amount/reference)
      if (
        dto.amount !== undefined ||
        dto.provider ||
        dto.reference ||
        dto.note
      ) {
        const pay = paymentRepo.create({
          order,
          provider: dto.provider ?? 'manual',
          providerPaymentId: dto.reference ?? null,
          status: dto.paymentStatus,
          amount:
            dto.amount !== undefined ? Number(dto.amount) : Number(order.total),
          approvedAt: dto.paymentStatus === 'approved' ? new Date() : null,
          raw: {
            manual: true,
            note: dto.note ?? null,
            previousPaymentStatus: prevPaymentStatus,
          },
        });
        await paymentRepo.save(pay);
      }

      // 4) Registrar historia de estado si cambia el estado operativo
      if (dto.orderStatus && dto.orderStatus !== prevOrderStatus) {
        await histRepo.save({
          order,
          fromStatus: prevOrderStatus,
          toStatus: dto.orderStatus,
          note:
            dto.note ??
            'Cambio manual de estado/pago desde panel de administración',
        });
      }

      // 5) Devolver la orden actualizada con info básica de pagos
      const payments = await paymentRepo.find({
        where: { order: { id: order.id } },
        order: { createdAt: 'DESC' },
      });

      return {
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
        payments: payments.map((p) => ({
          id: p.id,
          provider: p.provider,
          providerPaymentId: p.providerPaymentId,
          status: p.status,
          amount: Number(p.amount),
          approvedAt: p.approvedAt,
          createdAt: p.createdAt,
        })),
      };
    });
  }
}
