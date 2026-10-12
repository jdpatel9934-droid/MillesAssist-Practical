import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const res = context.switchToHttp().getResponse();
    // If response is a stream or raw buffer (like CSV export), bypass formatting
    const contentType = res.getHeader('Content-Type');
    if (contentType && String(contentType).includes('text/csv')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((response) => {
        // If already structured as success envelope
        if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
          const code = response.statusCode || 200;
          res.status(code);
          return {
            ...response,
            statusCode: code,
            timestamp: response.timestamp || new Date().toISOString(),
          };
        }

        // If returned object contains data and meta (like paginated responses)
        if (response && typeof response === 'object' && 'data' in response && 'meta' in response) {
          const code = response.statusCode || 200;
          res.status(code);
          return {
            success: true,
            statusCode: code,
            data: response.data,
            meta: response.meta,
            message: response.message || 'Operation successful',
            timestamp: new Date().toISOString(),
          };
        }

        const code = response.statusCode || 200;
        res.status(code);
        return {
          success: true,
          statusCode: code,
          data: response,
          message: 'Operation successful',
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
