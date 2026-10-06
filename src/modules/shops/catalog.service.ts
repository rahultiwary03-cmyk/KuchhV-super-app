import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../products/product.entity';
import { ShopEntity } from './shop.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shopRepo: Repository<ShopEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
  ) {}

  getActiveShops() {
    return this.shopRepo.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  getAvailableProducts(shopId: string) {
    return this.productRepo.find({
      where: { shop_id: shopId, is_available: true },
      order: { category: 'ASC', name: 'ASC' },
    });
  }
}
