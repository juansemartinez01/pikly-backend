import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { Payment } from '../entities/payment.entity';
import { WebhookEvent } from '../entities/webhook-event.entity';
import {
  MercadoPagoConfig,
  Preference,
  Payment as MPPayment,
} from 'mercadopago';

@Injectable()
export class MPService {
  private readonly logger = new Logger(MPService.name);
  private mp: {
    config: MercadoPagoConfig;
    preference: Preference;
    payment: MPPayment;
  };

  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(WebhookEvent) private whRepo: Repository<WebhookEvent>,
    private ds: DataSource,
  ) {
    const accessToken = process.env.MP_ACCESS_TOKEN!;
    const config = new MercadoPagoConfig({ accessToken });
    this.mp = {
      config,
      preference: new Preference(config),
      payment: new MPPayment(config),
    };
  }

  async createCheckoutPreference(orderNumber: string) {
    const order = await this.orderRepo.findOne({
      where: { orderNumber },
      relations: { items: true, priceList: true },
    });
    if (!order) throw new BadRequestException('Orden no encontrada');
    if (order.paymentStatus === 'approved')
      throw new BadRequestException('La orden ya está paga');

    const backUrls = {
      success: process.env.MP_BACK_URL_SUCCESS!,
      pending: process.env.MP_BACK_URL_PENDING!,
      failure: process.env.MP_BACK_URL_FAILURE!,
    };

    const items = order.items.map((i) => ({
      id: i.product?.id || i.combo?.id || 'item',
      title: i.nameSnapshot,
      quantity: Number(i.qty),
      currency_id: order.currency || 'ARS',
      unit_price: Number(i.unitPrice),
    }));

    const pref = await this.mp.preference.create({
      body: {
        items,
        external_reference: order.orderNumber,
        back_urls: backUrls,
        auto_return: 'approved',
        notification_url: process.env.MP_WEBHOOK_PUBLIC_URL!, // webhook
        statement_descriptor: 'Verduras&Frutas',
      },
    });

    return {
      preferenceId: pref.id,
      initPoint: (pref as any).init_point || (pref as any).sandbox_init_point,
    };
  }

  /** Idempotencia de webhooks + actualización de estado */
  async handleWebhook(headers: Record<string, any>, body: any) {
    // MP suele enviar: 'x-id', 'x-topic' (o 'data.id'/'type'), firma (x-signature) opcional
    const provider = 'mercadopago';
    const eventId =
      headers['x-id'] || body?.data?.id || body?.id || `${Date.now()}`;
    const topic = headers['x-topic'] || body?.type || 'unknown';

    // Registrar evento (idempotencia por unique)
    let wh = this.whRepo.create({
      provider,
      eventId: String(eventId),
      topic,
      signature: headers['x-signature'] || null,
      payload: body,
      processed: false,
    });

    try {
      wh = await this.whRepo.save(wh);
    } catch (e) {
      // ya procesado
      this.logger.warn(`Evento duplicado (${eventId})`);
      return { ok: true, duplicated: true };
    }

    // Si el webhook trae un "payment id", buscamos el pago
    const paymentId =
      body?.data?.id ||
      body?.id ||
      (body?.resource && String(body.resource).split('/').pop());

    if (!paymentId) {
      this.logger.warn(`Webhook sin paymentId util (${eventId})`);
      await this.whRepo.update({ id: wh.id }, { processed: true });
      return { ok: true, ignored: true };
    }

    // Consultar el pago a MP
    const mpPayment = await this.mp.payment.get({ id: String(paymentId) });

    const externalRef = (mpPayment as any)?.external_reference as
      | string
      | undefined;
    const status = (mpPayment as any)?.status as string | undefined;
    const amount =
      (mpPayment as any)?.transaction_details?.total_paid_amount ??
      (mpPayment as any)?.transaction_amount;

    if (!externalRef) {
      await this.whRepo.update({ id: wh.id }, { processed: true });
      return { ok: true, noExternalRef: true };
    }

    // Buscar orden por external_reference
    const order = await this.orderRepo.findOne({
      where: { orderNumber: externalRef },
    });
    if (!order) {
      await this.whRepo.update({ id: wh.id }, { processed: true });
      return { ok: true, orderNotFound: externalRef };
    }

    // Guardar/actualizar registro de pago
    let pay = await this.paymentRepo.findOne({
      where: {
        provider: 'mercadopago',
        providerPaymentId: String(paymentId),
        order: { id: order.id },
      },
      relations: { order: true },
    });
    if (!pay) {
      pay = this.paymentRepo.create({
        order,
        provider: 'mercadopago',
        providerPaymentId: String(paymentId),
        status: status || 'unknown',
        amount: Number(amount || 0),
        approvedAt: status === 'approved' ? new Date() : null,
        raw: mpPayment as any,
      });
    } else {
      pay.status = status || pay.status;
      pay.amount = Number(amount || pay.amount);
      pay.approvedAt =
        status === 'approved' ? pay.approvedAt || new Date() : pay.approvedAt;
      pay.raw = mpPayment as any;
    }
    await this.paymentRepo.save(pay);

    // Transición de estado
    if (status === 'approved' && order.paymentStatus !== 'approved') {
      order.paymentStatus = 'approved';
      // si recién se acredita, movemos a "to_pick"
      order.status = 'to_pick';
      await this.orderRepo.save(order);
      await this.ds.getRepository('order_status_history').save({
        order,
        fromStatus: 'created',
        toStatus: 'to_pick',
        note: 'Pago aprobado por MP',
      } as any);
    } else if (
      (status === 'rejected' || status === 'cancelled') &&
      order.paymentStatus !== 'rejected'
    ) {
      order.paymentStatus = 'rejected';
      await this.orderRepo.save(order);
      await this.ds.getRepository('order_status_history').save({
        order,
        fromStatus: order.status,
        toStatus: 'failed',
        note: 'Pago rechazado/cancelado MP',
      } as any);
    }

    await this.whRepo.update({ id: wh.id }, { processed: true });
    return { ok: true };
  }
}
