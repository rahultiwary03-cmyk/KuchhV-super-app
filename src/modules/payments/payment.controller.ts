import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
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
import { CreateRazorpayOrderDto } from './dto/payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  createOrder(
    @Body() dto: CreateRazorpayOrderDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.paymentService.createRazorpayOrder(dto, request.user.sub);
  }

  @Post('webhook')
  webhook(
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: unknown,
  ) {
    return this.paymentService.verifyWebhook(
      signature,
      request.rawBody,
      payload,
    );
  }
}
