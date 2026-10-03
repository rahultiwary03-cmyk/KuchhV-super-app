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
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CustomRequestService } from './custom-request.service';
import {
  CreateCustomRequestDto,
  SubmitBidDto,
} from './dto/custom-request.dto';

@ApiTags('custom requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('custom-requests')
export class CustomRequestController {
  constructor(private readonly customReqService: CustomRequestService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  createRequest(
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: CreateCustomRequestDto,
  ) {
    return this.customReqService.createRequest(request.user.sub, dto);
  }

  @Get('feed')
  @Roles(Role.DELIVERY_PARTNER, Role.ADMIN)
  getBroadcastingRequests() {
    return this.customReqService.getBroadcastingRequests();
  }

  @Post(':id/bid')
  @Roles(Role.DELIVERY_PARTNER)
  submitBid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitBidDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.customReqService.submitBid(id, request.user.sub, dto);
  }

  @Get(':id/bids')
  @Roles(Role.CUSTOMER, Role.DELIVERY_PARTNER, Role.ADMIN)
  getBids(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.customReqService.getBids(
      id,
      request.user.sub,
      request.user.role === Role.ADMIN,
    );
  }

  @Patch(':id/accept/:partnerId')
  @Roles(Role.CUSTOMER)
  acceptBid(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partnerId', ParseUUIDPipe) partnerId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.customReqService.acceptBid(id, partnerId, request.user.sub);
  }
}
