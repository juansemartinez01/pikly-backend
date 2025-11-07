import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    
    // Soportamos Authorization: Bearer xxx o x-admin-token: xxx
    const authHeader = req.headers['authorization'];
    const headerToken = req.headers['x-admin-token'] as string | undefined;

    let token: string | undefined;

    if (headerToken) {
      token = headerToken.trim();
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      throw new UnauthorizedException('Missing admin token');
    }

    // Leemos ADMIN_TOKEN o, si no existe, ADMIN_API_TOKEN
    const expected =
      this.config.get<string>('ADMIN_TOKEN') ||
      this.config.get<string>('ADMIN_API_TOKEN');

    if (!expected || token !== expected) {
      console.log('expected', expected, 'got', token, 'path', req.path);

      throw new UnauthorizedException('Invalid admin token');
    }


    return true;
  }
}
