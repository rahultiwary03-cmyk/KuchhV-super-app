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
import { BookRideDto, VerifyRideOtpDto } from './dto/ride.dto';
import { RideService } from './ride.service';

@ApiTags('rides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Post('book')
  @Roles(Role.CUSTOMER)
  book(
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: BookRideDto,
  ) {
    return this.rideService.book(request.user.sub, dto);
  }

  @Get('customer')
  @Roles(Role.CUSTOMER)
  getCustomerRides(@Req() request: Request & { user: JwtPayload }) {
    return this.rideService.getCustomerRides(request.user.sub);
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.DELIVERY_PARTNER, Role.ADMIN)
  getRide(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.rideService.getRide(id, request.user);
  }

  @Post(':id/accept')
  @Roles(Role.DELIVERY_PARTNER)
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.rideService.accept(id, request.user.sub);
  }

  @Post(':id/start-otp')
  @Roles(Role.CUSTOMER)
  generateStartOtp(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.rideService.generateStartOtp(id, request.user.sub);
  }

  @Patch(':id/start')
  @Roles(Role.DELIVERY_PARTNER)
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
    @Body() dto: VerifyRideOtpDto,
  ) {
    return this.rideService.start(id, request.user.sub, dto);
  }

  @Patch(':id/complete')
  @Roles(Role.DELIVERY_PARTNER)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.rideService.complete(id, request.user.sub);
  }
}
