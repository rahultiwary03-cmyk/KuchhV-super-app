import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('catalog')
@Controller('shops')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getActiveShops() {
    return this.catalogService.getActiveShops();
  }

  @Get(':id/products')
  getAvailableProducts(@Param('id', ParseUUIDPipe) shopId: string) {
    return this.catalogService.getAvailableProducts(shopId);
  }
}
