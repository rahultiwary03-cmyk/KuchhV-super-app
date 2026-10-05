import {
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
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get()
  getOverview(@Req() request: Request & { user: JwtPayload }) {
    return this.loyaltyService.getOverview(request.user.sub);
  }

  @Get('transactions')
  getTransactions(@Req() request: Request & { user: JwtPayload }) {
    return this.loyaltyService.getTransactions(request.user.sub);
  }

  @Post('vip/subscribe')
  subscribeVip(@Req() request: Request & { user: JwtPayload }) {
    return this.loyaltyService.subscribeVip(request.user.sub);
  }

  @Get('scratch-cards')
  getScratchCards(@Req() request: Request & { user: JwtPayload }) {
    return this.loyaltyService.getScratchCards(request.user.sub);
  }

  @Post('scratch-cards/:id/scratch')
  scratchCard(
    @Param('id', ParseUUIDPipe) cardId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.loyaltyService.scratchCard(request.user.sub, cardId);
  }
}
