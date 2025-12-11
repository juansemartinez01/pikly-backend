import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DeliverySlot } from '../entities/delivery-slot.entity';
import { CreateDeliverySlotDto } from '../dto/create-delivery-slot.dto';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliverySlot) private slotRepo: Repository<DeliverySlot>,
  ) {}

  // Seed simple de slots si no hay (Lun-Dom 10-13 / 14-18)
  async ensureSlotsFor(date: string) {
    const count = await this.slotRepo.count({ where: { date } });
    if (count > 0) return;
    const base = [
      { startTime: '10:00:00', endTime: '13:00:00' },
      { startTime: '14:00:00', endTime: '18:00:00' },
    ];
    await this.slotRepo.save(
      base.map((b) => ({ date, ...b, capacity: 100, taken: 0 })),
    );
  }

  async list(date: string) {
    await this.ensureSlotsFor(date);
    return this.slotRepo.find({
      where: { date: Between(date, date) },
      order: { startTime: 'ASC' },
      select: ['id', 'date', 'startTime', 'endTime', 'capacity', 'taken'],
    });
  }

  async create(dto: CreateDeliverySlotDto) {
    const slot = this.slotRepo.create({
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      capacity: dto.capacity ?? 50,
      taken: 0,
      zoneId: dto.zoneId ?? null,
    });

    return this.slotRepo.save(slot);
  }

  async take(slotId: string) {
    // decremento naive a prueba de colisión baja
    const slot = await this.slotRepo.findOne({ where: { id: slotId } });
    if (!slot) return;
    if (slot.taken >= slot.capacity)
      throw new Error('Capacidad de franja agotada');
    slot.taken += 1;
    await this.slotRepo.save(slot);
  }
}
