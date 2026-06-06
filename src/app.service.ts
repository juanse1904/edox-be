import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  ping() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
