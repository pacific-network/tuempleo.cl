import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from 'src/shared/decorators/user.decorator';

@UseGuards(AdminGuard)
@Controller('v1/admin')
export class AdminController {
  @Get('ping')
  ping(@User() user: any) {
    return {
      ok: true,
      message: 'Admin access confirmed',
      adminId: user.sub,
      email: user.email,
    };
  }
}
