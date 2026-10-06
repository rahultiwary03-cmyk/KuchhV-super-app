import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VerifyWorkflowOtpDto } from '../../common/dto/verify-workflow-otp.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  OnboardPartnerDto,
  ToggleOnlineDto,
  UpdateLocationDto,
} from './dto/delivery.dto';
import { DeliveryService } from './delivery.service';

@ApiTags('delivery partner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('partner')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('onboarding')
  @Roles(Role.DELIVERY_PARTNER)
  onboardPartner(
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: OnboardPartnerDto,
  ) {
    return this.deliveryService.onboardPartner(request.user.sub, dto);
  }

  @Patch(':id/status')
  @Roles(Role.DELIVERY_PARTNER, Role.ADMIN)
  toggleOnline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleOnlineDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.deliveryService.toggleOnline(
      id,
      request.user.sub,
      request.user.role === Role.ADMIN,
      dto,
    );
  }

  @Patch(':id/location')
  @Roles(Role.DELIVERY_PARTNER, Role.ADMIN)
  updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.deliveryService.updateLocation(
      id,
      request.user.sub,
      request.user.role === Role.ADMIN,
      dto,
    );
  }

  @Post('assign/:orderId')
  @Roles(Role.ADMIN)
  assignPartner(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.deliveryService.assignNearestPartner(orderId);
  }

  @Get('dispatch/queue')
  @Roles(Role.DELIVERY_PARTNER)
  getDispatchQueue(@Req() request: Request & { user: JwtPayload }) {
    return this.deliveryService.getDispatchQueue(request.user.sub);
  }

  @Get('orders/current')
  @Roles(Role.DELIVERY_PARTNER)
  getPartnerOrders(@Req() request: Request & { user: JwtPayload }) {
    return this.deliveryService.getPartnerOrders(request.user.sub);
  }

  @Post('orders/:id/pickup-otp/verify')
  @Roles(Role.DELIVERY_PARTNER)
  verifyPickupOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: VerifyWorkflowOtpDto,
  ) {
    return this.deliveryService.verifyPickupOtp(id, request.user.sub, dto);
  }

  @Post('orders/:id/handover-otp/verify')
  @Roles(Role.DELIVERY_PARTNER)
  verifyHandoverOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: VerifyWorkflowOtpDto,
  ) {
    return this.deliveryService.verifyHandoverOtp(id, request.user.sub, dto);
  }
}
