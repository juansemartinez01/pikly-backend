import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DeliverySlot } from '../entities/delivery-slot.entity';
import { CreateDeliverySlotDto } from '../dto/create-delivery-slot.dto';
import { DeliveryDayTemplate } from '../entities/delivery-day-template.entity';
import { UpsertWeekdaySlotsDto, WeekdayName } from '../dto/upsert-weekday-slots.dto';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliverySlot) private slotRepo: Repository<DeliverySlot>,
    @InjectRepository(DeliveryDayTemplate)
    private templateRepo: Repository<DeliveryDayTemplate>,
  ) {}

  async ensureSlotsFor(date: string) {
    const count = await this.slotRepo.count({ where: { date } });
    if (count > 0) return;

    const weekday = this.weekdayFromDate(date);

    const templates = await this.templateRepo.find({
      where: { weekday, active: true },
      order: { startTime: 'ASC' },
    });

    // Si no hay plantillas para ese día, no generamos nada
    if (templates.length === 0) {
      return;
    }

    await this.slotRepo.save(
      templates.map((t) => ({
        date,
        startTime: t.startTime,
        endTime: t.endTime,
        capacity: t.capacity,
        taken: 0,
        zoneId: t.zoneId ?? null,
      })),
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

  // --------- helpers ----------

  private weekdayNameToNumber(name: WeekdayName): number {
    const map: Record<WeekdayName, number> = {
      LUNES: 1,
      MARTES: 2,
      MIERCOLES: 3,
      JUEVES: 4,
      VIERNES: 5,
      SABADO: 6,
      DOMINGO: 7,
    };
    return map[name];
  }

  /** Interpreta la fecha como día de AR (simple) */
  private weekdayFromDate(date: string): number {
    const [y, m, d] = date.split('-').map(Number);
    // usamos UTC para no comernos issues de TZ del server
    const dt = new Date(Date.UTC(y, m - 1, d));
    let wd = dt.getUTCDay(); // 0=domingo ... 6=sábado
    if (wd === 0) wd = 7;
    return wd; // 1=lunes..7=domingo
  }

  // --------- plantillas por día ----------

  async upsertWeekdaySlots(dto: UpsertWeekdaySlotsDto) {
    if (!dto.slots || dto.slots.length === 0) {
      throw new BadRequestException('Debe enviar al menos una franja');
    }

    const weekday = this.weekdayNameToNumber(dto.weekday);

    // Borramos plantillas anteriores de ese día
    await this.templateRepo.delete({ weekday });

    const toSave = dto.slots.map((s) =>
      this.templateRepo.create({
        weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity ?? 50,
        zoneId: s.zoneId ?? null,
        active: true,
      }),
    );

    return this.templateRepo.save(toSave);
  }

  async getWeekdaySlots(weekdayName: WeekdayName) {
    const weekday = this.weekdayNameToNumber(weekdayName);
    return this.templateRepo.find({
      where: { weekday, active: true },
      order: { startTime: 'ASC' },
    });
  }
}
