import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { MPService } from '../services/mp.service';
import { CreateCheckoutDto } from '../dto/create-checkout.dto';

@Controller('payments/mercadopago')
export class MPController {
  constructor(private mp: MPService) {}

  @Post('checkout')
  async createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.mp.createCheckoutPreference(dto.orderNumber);
  }

  // MP reintenta varias veces → siempre 200 si pudimos registrar el evento
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Headers() headers: Record<string, any>, @Body() body: any) {
    return this.mp.handleWebhook(headers, body);
  }
}
