import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  AdEventDto,
  CreateAdCampaignDto,
  SponsoredPlacementQueryDto,
} from './dto/ad.dto';
import { AdsService } from './ads.service';

@ApiTags('sponsored ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('placements')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  getSponsoredPlacements(@Query() query: SponsoredPlacementQueryDto) {
    return this.adsService.getSponsoredPlacements(query);
  }

  @Post('campaigns')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  createCampaign(
    @Body() dto: CreateAdCampaignDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.adsService.createCampaign(request.user.sub, dto);
  }

  @Get('campaigns')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  getCampaigns(@Req() request: Request & { user: JwtPayload }) {
    return this.adsService.getCampaigns(request.user.sub);
  }

  @Get('campaigns/:id/analytics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  getCampaignAnalytics(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.adsService.getAnalytics(request.user.sub, campaignId);
  }

  @Post('campaigns/:id/stop')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  stopCampaign(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.adsService.stopCampaign(request.user.sub, campaignId);
  }

  @Post('campaigns/:id/impressions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  recordImpression(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: AdEventDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.adsService.recordImpression(
      request.user.sub,
      campaignId,
      dto.event_id,
    );
  }

  @Post('campaigns/:id/clicks')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  recordClick(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: AdEventDto,
    @Req() request: Request & { user: JwtPayload },
  ) {
    return this.adsService.recordClick(
      request.user.sub,
      campaignId,
      dto.event_id,
    );
  }
}
