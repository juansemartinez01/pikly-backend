import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CartService } from '../services/cart.service';
import { CreateCartDto } from '../dto/create-cart.dto';
import { AddItemDto } from '../dto/add-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';

@Controller('cart')
export class CartController {
  constructor(private svc: CartService) {}

  @Post()
  create(@Body() dto: CreateCartDto) {
    return this.svc.createCart(dto);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post('items')
  addItem(@Body() dto: AddItemDto) {
    return this.svc.addItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.svc.updateItem(id, dto);
  }

  @Delete('items/:id')
  removeItem(@Param('id') id: string) {
    return this.svc.removeItem(id);
  }
}
