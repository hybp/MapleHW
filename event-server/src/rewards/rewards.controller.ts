import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { HeaderAuthGuard } from '../auth/guards/header-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { User } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/guards/header-auth.guard';

// Base path could be /rewards, and specific event rewards under /events/:eventId/rewards
// For simplicity, keeping PRD structure: POST /events/:eventId/rewards, GET /events/:eventId/rewards
// and GET /rewards/:id, PUT /rewards/:id, DELETE /rewards/:id

@Controller() // No base path here, defined by route decorators
@UseGuards(HeaderAuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN)
  @Post('events/:eventId/rewards')
  @HttpCode(HttpStatus.CREATED)
  create(@Param('eventId') eventId: string, @Body() createRewardDto: CreateRewardDto, @User() user: AuthenticatedUser) {
    if (createRewardDto.eventId !== eventId) {
        throw new BadRequestException('Event ID in path and body must match');
    }
    return this.rewardsService.create(createRewardDto, user.userId);
  }

  @Get('events/:eventId/rewards')
  findAllForEvent(@Param('eventId') eventId: string) {
    return this.rewardsService.findAllForEvent(eventId);
  }

  @Get('rewards/:id')
  findOne(@Param('id') id: string) {
    return this.rewardsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN)
  @Put('rewards/:id')
  update(@Param('id') id: string, @Body() updateRewardDto: UpdateRewardDto, @User() user: AuthenticatedUser) {
    return this.rewardsService.update(id, updateRewardDto, user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN)
  @Delete('rewards/:id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @User() user: AuthenticatedUser) {
    return this.rewardsService.delete(id, user.userId);
  }
}
