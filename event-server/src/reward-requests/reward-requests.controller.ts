import { Controller, Get, Post, Body, Param, Patch, UseGuards, HttpCode, HttpStatus, ForbiddenException, BadRequestException, Query } from '@nestjs/common';
import { RewardRequestsService } from './reward-requests.service';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { UpdateRewardRequestDto } from './dto/update-reward-request.dto';
import { HeaderAuthGuard } from '../auth/guards/header-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/roles.enum';
import { User } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/guards/header-auth.guard';
import { ListRewardRequestsDto } from './dto/list-reward-requests.dto';

@Controller()
@UseGuards(HeaderAuthGuard)
export class RewardRequestsController {
  constructor(private readonly rewardRequestsService: RewardRequestsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @Post('events/:eventId/request')
  @HttpCode(HttpStatus.CREATED)
  async submitRequest(
    @Param('eventId') pathEventId: string,
    @Body() createDto: CreateRewardRequestDto, 
    @User() user: AuthenticatedUser
  ) {
    if (createDto.eventId !== pathEventId) {
      throw new BadRequestException('Event ID in path and DTO must match.');
    }
    return this.rewardRequestsService.submitRequest(createDto, user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.USER)
  @Get('requests/me')
  async findUserRequests(@User() user: AuthenticatedUser) {
    return this.rewardRequestsService.findUserRequests(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.AUDITOR, Role.ADMIN)
  @Get('requests')
  async findAllRequests(
    @User() user: AuthenticatedUser,
    @Query() queryParams: ListRewardRequestsDto
  ) {
    return this.rewardRequestsService.findAllRequests(queryParams);
  }

  @Get('requests/:id')
  async findRequestById(@Param('id') id: string, @User() user: AuthenticatedUser) {
    const request = await this.rewardRequestsService.findRequestById(id);
    // user is now AuthenticatedUser { userId: string, role: Role }

    // Authorization: User can see their own, Operator/Auditor/Admin can see any
    if (user.role !== Role.OPERATOR && 
        user.role !== Role.ADMIN && 
        user.role !== Role.AUDITOR && 
        request.userId.toString() !== user.userId) {
      throw new ForbiddenException('Access denied to view this reward request.');
    }
    return request;
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN)
  @Patch('requests/:id/status')
  async updateRequestStatus(
    @Param('id') id: string, 
    @Body() updateDto: UpdateRewardRequestDto, 
    @User() user: AuthenticatedUser
  ) {
    return this.rewardRequestsService.updateRequestStatus(id, updateDto, user.userId);
  }
}
