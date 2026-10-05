import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
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
import { SetPayoutProfileDto } from './dto/wallet.dto';
import { WalletPayoutService } from './wallet-payout.service';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly payoutService: WalletPayoutService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.DELIVERY_PARTNER)
  getBalance(@Req() request: Request & { user: JwtPayload }) {
    return this.walletService.getBalance(request.user.sub);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.DELIVERY_PARTNER)
  getHistory(
    @Req() request: Request & { user: JwtPayload },
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit === undefined ? 50 : Number(limit);
    return this.walletService.getHistory(
      request.user.sub,
      Number.isInteger(parsedLimit) ? parsedLimit : 50,
    );
  }

  @Post('orders/:id/pay')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  payOrder(
    @Param('id', ParseUUIDPipe) orderId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.walletService.payOrder(orderId, request.user.sub);
  }

  @Put('payout-profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.DELIVERY_PARTNER)
  setPayoutProfile(
    @Body() dto: SetPayoutProfileDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.payoutService.setProfile(request.user.sub, dto.vpa);
  }

  @Get('payout-profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.DELIVERY_PARTNER)
  getPayoutProfile(@Req() request: Request & { user: JwtPayload }) {
    return this.payoutService.getProfile(request.user.sub);
  }

  @Get('payouts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR, Role.DELIVERY_PARTNER)
  getPayoutHistory(@Req() request: Request & { user: JwtPayload }) {
    return this.payoutService.getPayoutHistory(request.user.sub);
  }

  @Post('payout-webhook')
  payoutWebhook(
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: unknown,
  ) {
    return this.payoutService.verifyPayoutWebhook(
      signature,
      request.rawBody,
      payload,
    );
  }

  @Post('admin/payout-batches')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  runPayoutBatch() {
    return this.payoutService.runManualBatch();
  }

  @Post('admin/payouts/:id/reconcile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  reconcilePayout(@Param('id', ParseUUIDPipe) payoutId: string) {
    return this.payoutService.reconcilePayout(payoutId);
  }
}
