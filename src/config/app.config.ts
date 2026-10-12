import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  appName: process.env.APP_NAME || 'AdminHub Backend',
  timezone: process.env.APP_TIMEZONE || 'UTC',
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  dateFormat: {
    displayDate: 'MMM D, YYYY',
    displayDateTime: 'MMM D, YYYY HH:mm',
    iso: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  },
  thresholds: {
    pendingTransactionsAlertLimit: 15,
    serverCapacityWarningPercentage: 90,
  },
}));
