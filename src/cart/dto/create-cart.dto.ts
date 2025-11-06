import { IsOptional, IsString } from 'class-validator';

export class CreateCartDto {
  @IsOptional() @IsString() sessionId?: string;
  @IsOptional() @IsString() priceList?: string; // nombre (Retail/Mayorista)
}
