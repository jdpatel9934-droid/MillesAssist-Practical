import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ChartQueryDto } from './dto/chart-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'KPI and statistics card values (Users, Revenue, Bookings, Transactions)' })
  @ApiResponse({ status: 200, description: 'Dashboard KPI metrics returned successfully.' })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('charts')
  @ApiOperation({ summary: 'Chart series data for revenue trends over 7D, 1M, 3M, 6M, 1Y' })
  @ApiResponse({ status: 200, description: 'Aggregated revenue chart series returned successfully.' })
  async getCharts(@Query() query: ChartQueryDto) {
    return this.dashboardService.getCharts(query);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Important system alerts and operational notices' })
  @ApiResponse({ status: 200, description: 'Active system notices returned successfully.' })
  async getAlerts() {
    return this.dashboardService.getAlerts();
  }

  @Get('health')
  @ApiOperation({ summary: 'System health metrics (Uptime, response time, active sessions)' })
  @ApiResponse({ status: 200, description: 'System health status returned successfully.' })
  async getHealth() {
    return this.dashboardService.getHealth();
  }
}
