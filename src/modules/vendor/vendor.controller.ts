import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  CreateProductDto,
  RegisterShopDto,
  UpdateOrderStatusDto,
  UpdateStockDto,
} from './dto/vendor.dto';
import { VendorService } from './vendor.service';

@ApiTags('vendor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post('register-shop')
  @Roles(Role.VENDOR, Role.ADMIN)
  registerShop(
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: RegisterShopDto,
  ) {
    return this.vendorService.registerShop(request.user.sub, dto);
  }

  @Post('orders/:id/pickup-otp')
  @Roles(Role.VENDOR, Role.ADMIN)
  generatePickupOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.vendorService.generatePickupOtp(
      id,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }

  @Get('products')
  @Roles(Role.VENDOR, Role.ADMIN)
  getProducts(
    @Query('shop_id', ParseUUIDPipe) shopId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.vendorService.getProducts(
      shopId,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }

  @Post('products')
  @Roles(Role.VENDOR, Role.ADMIN)
  createProduct(
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: CreateProductDto,
  ) {
    return this.vendorService.createProduct(
      dto,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }

  @Patch('products/:id/stock')
  @Roles(Role.VENDOR, Role.ADMIN)
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.vendorService.updateStock(
      id,
      dto,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }

  @Get('orders')
  @Roles(Role.VENDOR, Role.ADMIN)
  getVendorOrders(
    @Query('shop_id', ParseUUIDPipe) shopId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.vendorService.getVendorOrders(
      shopId,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }

  @Patch('orders/:id/status')
  @Roles(Role.VENDOR, Role.ADMIN)
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.vendorService.updateOrderStatus(
      id,
      dto,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }
}
