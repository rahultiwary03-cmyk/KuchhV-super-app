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
import { CreateServiceRequestDto } from './dto/service-request.dto';
import { ServiceRequestService } from './service-request.service';

@ApiTags('service requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('service-requests')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  create(
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.serviceRequestService.create(request.user.sub, dto);
  }

  @Get('customer')
  @Roles(Role.CUSTOMER)
  getCustomerRequests(@Req() request: Request & { user: JwtPayload }) {
    return this.serviceRequestService.getCustomerRequests(request.user.sub);
  }

  @Get('feed')
  @Roles(Role.SERVICE_PROVIDER)
  getProviderFeed() {
    return this.serviceRequestService.getProviderFeed();
  }

  @Post(':id/accept')
  @Roles(Role.SERVICE_PROVIDER)
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.serviceRequestService.accept(id, request.user.sub);
  }

  @Patch(':id/start')
  @Roles(Role.SERVICE_PROVIDER)
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.serviceRequestService.start(id, request.user.sub);
  }

  @Post(':id/completion-otp')
  @Roles(Role.CUSTOMER)
  generateCompletionOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.serviceRequestService.generateCompletionOtp(
      id,
      request.user.sub,
    );
  }

  @Post(':id/completion-otp/verify')
  @Roles(Role.SERVICE_PROVIDER)
  verifyCompletionOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: VerifyWorkflowOtpDto,
  ) {
    return this.serviceRequestService.verifyCompletionOtp(
      id,
      request.user.sub,
      dto,
    );
  }
}
