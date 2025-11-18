import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, IsNull, Repository } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { OrderStatusHistory } from '../../orders/entities/order-status-history.entity';
import { StockCurrent } from '../../orders/entities/stock-current.entity';
import { StockReservation } from '../../orders/entities/stock-reservation.entity';
import { DriverAssignment } from '../../orders/entities/driver-assignment.entity';
import { ListOrdersDto } from '../dto/list-orders.dto';
import { AssignDriverDto } from '../dto/assign-driver.dto';
import { UpdateStatusDto } from '../dto/update-status.dto';
import { MarkDeliveredDto } from '../dto/mark-delivered.dto';

@Injectable()
export class OpsService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private itemRepo: Repository<OrderItem>,
    @InjectRepository(OrderStatusHistory)
    private histRepo: Repository<OrderStatusHistory>,
    @InjectRepository(StockCurrent) private stockRepo: Repository<StockCurrent>,
    @InjectRepository(StockReservation)
    private resRepo: Repository<StockReservation>,
    @InjectRepository(DriverAssignment)
    private drvRepo: Repository<DriverAssignment>,
    private ds: DataSource,
  ) {}

  private allowed(from: Order['status'], to: UpdateStatusDto['toStatus']) {
    const map: Record<string, string[]> = {
      created: ['to_pick', 'cancelled', 'failed'],
      payment_pending: ['paid', 'failed', 'cancelled'], // MP mueve a paid vía webhook
      paid: ['to_pick', 'cancelled'],
      to_pick: ['packed', 'cancelled'],
      packed: ['out_for_delivery', 'cancelled'],
      out_for_delivery: ['delivered', 'failed'],
      delivered: [],
      cancelled: [],
      failed: [],
    };
    return map[from]?.includes(to) ?? false;
  }

  async list(dto: ListOrdersDto) {
    const page = Math.max(1, Number(dto.page || 1));
    const limit = Math.min(100, Math.max(1, Number(dto.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status) where.status = dto.status;
    if (dto.q) {
      where.orderNumber = ILike(`%${dto.q}%`);
    }

    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
      relations: { address: true, customer: true },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        discountTotal: true,
        shippingTotal: true,
        total: true,
        deliveryDate: true,
        createdAt: true,
        customer: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
        },
        address: { id: true, street: true, number: true, city: true },
      },
    });

    return { page, limit, total, items };
  }

  /** Descuenta stock_current contra reservas y borra reservas */
  private async finalizePickToPacked(orderId: string) {
    const reservations = await this.resRepo.find({
      where: { order: { id: orderId } },
      relations: { product: true },
    });
    for (const r of reservations) {
      const sc = await this.stockRepo.findOne({
        where: { product: { id: r.product.id }, warehouseId: IsNull() },
        relations: { product: true },
      });
      const cur = sc ? Number(sc.qty) : 0;
      if (cur < Number(r.qty)) {
        throw new BadRequestException(
          `Stock insuficiente para ${r.product.name}: ${cur} < ${r.qty}`,
        );
      }
    }
    for (const r of reservations) {
      let sc = await this.stockRepo.findOne({
        where: { product: { id: r.product.id }, warehouseId: IsNull() },
        relations: { product: true },
      });
      if (!sc) {
        sc = this.stockRepo.create({
          product: r.product,
          warehouseId: null,
          qty: 0,
        });
      }
      sc.qty = Number((Number(sc.qty) - Number(r.qty)).toFixed(3));
      await this.stockRepo.save(sc);
    }
    await this.resRepo.delete({ order: { id: orderId } });
  }

  async updateStatus(orderNumber: string, dto: UpdateStatusDto) {
    return this.ds.transaction(async (m) => {
      const repo = m.getRepository(Order);
      const order = await repo.findOne({ where: { orderNumber } });
      if (!order) throw new NotFoundException('Orden no encontrada');

      if (!this.allowed(order.status, dto.toStatus)) {
        throw new BadRequestException(
          `Transición inválida: ${order.status} -> ${dto.toStatus}`,
        );
      }

      // Regla clave: pasar a 'packed' descuenta stock contra reservas
      if (dto.toStatus === 'packed') {
        await this.finalizePickToPacked(order.id);
      }

      const from = order.status;
      order.status = dto.toStatus as any;
      await repo.save(order);

      await m.getRepository(OrderStatusHistory).save({
        order,
        fromStatus: from,
        toStatus: order.status,
        note: dto.note || null,
      });

      return await this.orderRepo.findOne({
        where: { orderNumber },
        relations: { items: true, address: true, customer: true },
      });
    });
  }

  async assignDriver(orderNumber: string, dto: AssignDriverDto) {
    const order = await this.orderRepo.findOne({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Orden no encontrada');

    const a = this.drvRepo.create({
      order,
      driverName: dto.driverName || null,
      driverPhone: dto.driverPhone || null,
    });
    await this.drvRepo.save(a);

    // si aún no estaba en out_for_delivery, lo movemos
    if (order.status === 'packed') {
      await this.updateStatus(orderNumber, {
        toStatus: 'out_for_delivery',
        note: 'Asignado a repartidor',
      } as any);
    }
    return a;
  }

  async markDelivered(orderNumber: string, dto: MarkDeliveredDto) {
    const order = await this.orderRepo.findOne({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status !== 'out_for_delivery') {
      throw new BadRequestException(
        `La orden debe estar 'out_for_delivery' para marcar entregada. Estado: ${order.status}`,
      );
    }

    // actualizar assignment
    const assign = await this.drvRepo.findOne({
      where: { order: { id: order.id } },
      order: { assignedAt: 'DESC' },
    });
    if (assign) {
      assign.deliveredAt = new Date();
      assign.proofUrl = dto.proofUrl || assign.proofUrl || null;
      await this.drvRepo.save(assign);
    }

    // cerrar orden
    return this.updateStatus(orderNumber, {
      toStatus: 'delivered',
      note: 'Entrega confirmada',
    } as any);
  }

  // ---------- STOCK: consultas simples ----------

  async listStock(warehouseId?: string | null) {
    const where: any = {};
    if (warehouseId === 'null') warehouseId = null;
    if (warehouseId !== undefined) {
      where.warehouseId = warehouseId;
    }

    const rows = await this.stockRepo.find({
      where,
      relations: { product: true },
      order: { qty: 'ASC' },
    });

    return rows.map((r) => ({
      id: r.id,
      product: {
        id: r.product.id,
        // si tu Product tiene sku, lo exponemos también
        sku: (r.product as any).sku ?? null,
        name: r.product.name,
      },
      warehouseId: r.warehouseId ?? null,
      qty: Number(r.qty),
    }));
  }

  async stockForProduct(productId: string, warehouseId?: string | null) {
    const where: any = { product: { id: productId } };
    if (warehouseId === 'null') warehouseId = null;
    if (warehouseId !== undefined) {
      where.warehouseId = warehouseId;
    }

    const sc = await this.stockRepo.findOne({
      where,
      relations: { product: true },
    });

    // Si no hay registro, devolvemos qty 0 en vez de tirar 404
    if (!sc) {
      return {
        id: null,
        product: { id: productId },
        warehouseId: warehouseId ?? null,
        qty: 0,
      };
    }

    return {
      id: sc.id,
      product: {
        id: sc.product.id,
        sku: (sc.product as any).sku ?? null,
        name: sc.product.name,
      },
      warehouseId: sc.warehouseId ?? null,
      qty: Number(sc.qty),
    };
  }
}
