import { IsOptional, IsString } from 'class-validator';
export class MarkDeliveredDto {
  @IsOptional() @IsString() proofUrl?: string; // foto, link a recibo, etc.
}
