import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

/**
 * Single funnel for every unhandled error. Known HttpExceptions keep their
 * status/message; anything else is normalized to a 500 without leaking internals.
 * Uses HttpAdapterHost so it stays platform-agnostic (Express/Fastify).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    // `getStatus()` devuelve un número suelto, no un miembro del enum, así que
    // se anota el tipo para poder compararlo con `HttpStatus` más abajo.
    const httpStatus: HttpStatus =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        message = (r.message as string | string[]) ?? exception.message;
        error = (r.error as string) ?? exception.name;
      }
    }

    const body: ErrorBody = {
      statusCode: httpStatus,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${httpStatus}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    httpAdapter.reply(ctx.getResponse(), body, httpStatus);
  }
}
