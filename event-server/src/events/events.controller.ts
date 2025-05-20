import { Controller, Get, Post, Body, Param, Put, Patch, UseGuards, ParseEnumPipe, HttpStatus, HttpCode, BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from './enums/event-status.enum';
import { HeaderAuthGuard } from '../auth/guards/header-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard'; 
import { Roles } from '../auth/decorators/roles.decorator'; 
import { Role } from '../auth/roles.enum'; 
import { User } from '../auth/decorators/user.decorator';
import { AuthenticatedUser } from '../auth/guards/header-auth.guard';

@Controller('events')
@UseGuards(HeaderAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createEventDto: CreateEventDto, @User() user: AuthenticatedUser) {
    return this.eventsService.create(createEventDto, user.userId);
  }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @User() user: AuthenticatedUser) {
    return this.eventsService.update(id, updateEventDto, user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string, 
    @Body('status', new ParseEnumPipe(EventStatus, { 
        errorHttpStatusCode: HttpStatus.BAD_REQUEST,
        exceptionFactory: (errors) => new BadRequestException('Invalid status value') 
    })) status: EventStatus,
    @User() user: AuthenticatedUser
  ) {
    return this.eventsService.updateStatus(id, status, user.userId);
  }
}
