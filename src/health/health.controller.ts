import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthCheckError } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' as const } };
        } catch {
          throw new HealthCheckError('Database check failed', {
            database: { status: 'down' as const },
          });
        }
      },
    ]);
  }
}
