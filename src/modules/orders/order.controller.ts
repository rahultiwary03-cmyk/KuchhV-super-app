import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreateOrderDto } from './dto/order.dto';
import { OrderService } from './order.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  createOrder(
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(request.user.sub, dto);
  }

  @Get('customer')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  getCustomerOrders(@Req() request: Request & { user: JwtPayload }) {
    return this.orderService.getCustomerOrders(request.user.sub);
  }

  @Get(':id/tracking')
  @Roles(Role.CUSTOMER, Role.DELIVERY_PARTNER, Role.ADMIN)
  getOrderTracking(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.orderService.getOrderTracking(
      id,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }
}
