import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';

export class CreateOrderDto {
  @IsString() cartId!: string;

  @IsOptional() @IsString() customerEmail?: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsString() customerFirstName?: string;
  @IsOptional() @IsString() customerLastName?: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @IsDateString() deliveryDate!: string; // YYYY-MM-DD
  @IsOptional() @IsString() deliverySlotId?: string;

  @IsOptional() @IsBoolean() markAsPaid?: boolean; // para pruebas (pago diferido se hace en iteración 5)
  @IsOptional() @IsString() notes?: string;
}
