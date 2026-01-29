import {ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus,} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Визначаємо статус код
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Отримуємо повідомлення помилки
    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = exceptionResponse?.message || 
                    (exception instanceof Error ? exception.message : 'Internal server error');

    // Формуємо красиву відповідь
    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message, // Тут буде "PIN-код не налаштовано" або "Невірний пароль"
    });
  }
}