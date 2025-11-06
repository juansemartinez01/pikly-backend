import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private svc: SearchService) {}

  @Get()
  async search(
    @Query('q') q: string,
    @Query('priceList') priceList?: string,
    @Query('limit') limit?: string,
  ) {
    if (!q || !q.trim()) return { q: '', items: [] };
    const lim = Math.max(1, Math.min(50, Number(limit || 20)));
    return this.svc.search(q.trim(), priceList, lim);
  }
}
