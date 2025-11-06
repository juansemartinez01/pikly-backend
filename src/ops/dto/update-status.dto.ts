import { IsIn, IsOptional, IsString } from 'class-validator';
export class UpdateStatusDto {
  @IsIn([
    'to_pick',
    'packed',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'failed',
  ])
  toStatus!:
    | 'to_pick'
    | 'packed'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled'
    | 'failed';

  @IsOptional() @IsString() note?: string;
}
