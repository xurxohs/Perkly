import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DiagnosticsService } from './diagnostics.service';
import type { DiagnosticInput } from './diagnostics.service';

@Controller('diagnostics')
export class DiagnosticsController {
  private readonly clients = new Map<
    string,
    { count: number; resetAt: number }
  >();
  constructor(private readonly diagnostics: DiagnosticsService) {}
  @Post('events')
  report(@Req() req: FastifyRequest, @Body() body: DiagnosticInput) {
    const now = Date.now();
    const key = req.ip || 'unknown';
    const current = this.clients.get(key);
    if (!current || current.resetAt <= now) {
      this.clients.set(key, { count: 1, resetAt: now + 60_000 });
    } else {
      current.count += 1;
      if (current.count > 30) {
        throw new HttpException(
          'Too many diagnostic reports',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    return this.diagnostics.report(body);
  }
  @Get('summary')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  summary() {
    return this.diagnostics.summary();
  }
}
