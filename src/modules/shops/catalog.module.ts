import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from './shop.entity';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShopEntity, ProductEntity])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
