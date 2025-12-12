import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type {
  PaymentStatus,
  OrderStatus,
} from '../../orders/entities/order.entity';

const PAYMENT_STATUS_VALUES: PaymentStatus[] = [
  'pending',
  'approved',
  'rejected',
  'refunded',
];

const ORDER_STATUS_VALUES: OrderStatus[] = [
  'created',
  'payment_pending',
  'paid',
  'to_pick',
  'packed',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'failed',
];

export class ManualUpdatePaymentDto {
  // Estado de pago que queremos reflejar en la orden
  @IsString()
  @IsIn(PAYMENT_STATUS_VALUES as string[])
  paymentStatus!: PaymentStatus;

  // Opcional: también mover el estado operativo de la orden
  @IsOptional()
  @IsString()
  @IsIn(ORDER_STATUS_VALUES as string[])
  orderStatus?: OrderStatus;

  // Opcional: registrar un pago manual (monto)
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  // Opcional: proveedor (ej. 'manual', 'efectivo', 'transferencia')
  @IsOptional()
  @IsString()
  provider?: string;

  // Opcional: referencia externa (nro de comprobante, etc.)
  @IsOptional()
  @IsString()
  reference?: string;

  // Nota para auditoría y OrderStatusHistory
  @IsOptional()
  @IsString()
  note?: string;
}
