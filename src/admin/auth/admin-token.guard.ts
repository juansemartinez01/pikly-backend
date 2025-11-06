import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers['x-admin-token'];
    if (!token || token !== process.env.ADMIN_API_TOKEN) {
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}
