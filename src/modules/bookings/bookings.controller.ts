import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) { }

  @Get()
  @ApiOperation({ summary: 'Paginated booking list with search, filters and date filtering' })
  @ApiResponse({ status: 200, description: 'Paginated bookings list returned successfully.' })
  async findAll(@Query() query: QueryBookingsDto) {
    return this.bookingsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Bookings directory KPI statistics summary cards' })
  @ApiResponse({ status: 200, description: 'Summary statistics returned successfully.' })
  async getStats() {
    return this.bookingsService.getStats();
  }

  @Get('export')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export filtered bookings as a CSV file' })
  @ApiResponse({ status: 200, description: 'CSV stream returned.' })
  async exportCsv(@Query() query: QueryBookingsDto, @Res() res: Response) {
    const filename = `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const stream = await this.bookingsService.exportCsvStream(query);
    stream.pipe(res);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Booking detail view with logistics, breakdown, and lifecycle history' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking details returned successfully.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Create booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  async create(@Body() createDto: CreateBookingDto) {
    return this.bookingsService.create(createDto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update, reschedule or cancel booking' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update or cancellation request.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateDto);
  }
}
