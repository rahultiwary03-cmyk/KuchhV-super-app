import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { ReviewPartnerKycDto } from './dto/review-partner-kyc.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('pending-partners')
  getPendingPartners() {
    return this.adminService.getPendingPartners();
  }

  @Patch('partner/:id/kyc')
  reviewKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewPartnerKycDto,
  ) {
    return this.adminService.reviewPartnerKyc(id, dto.action);
  }
}
