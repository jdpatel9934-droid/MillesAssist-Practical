import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        message = resObj.message || exception.message;
        errorName = resObj.error || exception.name;
      } else {
        message = String(res);
        errorName = exception.name;
      }
    } else if (exception instanceof QueryFailedError) {
      const driverError = (exception as any).driverError;
      // PostgreSQL Unique constraint violation code is 23505
      if (driverError && driverError.code === '23505') {
        statusCode = HttpStatus.CONFLICT;
        errorName = 'Conflict';
        message = driverError.detail || 'A record with this unique value already exists.';
      } else if (driverError && driverError.code === '23503') {
        // Foreign key violation
        statusCode = HttpStatus.BAD_REQUEST;
        errorName = 'Foreign Key Violation';
        message = driverError.detail || 'Referenced record does not exist or cannot be deleted.';
      } else {
        statusCode = HttpStatus.BAD_REQUEST;
        errorName = 'Database Error';
        message = 'A database query error occurred.';
      }
      this.logger.error(`Database Exception: ${exception.message}`, exception.stack);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      errorName = exception.name;
      // Do not leak stack trace in production response
      message = process.env.NODE_ENV === 'development' ? exception.message : 'Internal server error';
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
