import {
    Controller,
    Post,
    Body,
    Get,
    Patch,
    Param,
    Query,
    ParseIntPipe,
    UseGuards,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guards';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from 'src/shared/decorators/user.decorator';
import { BugService } from './bug.service';
import { CreateBugDto } from './dto/create-bug.dto';
import { UpdateBugStatusDto } from './dto/update-bug-status.dto';
import { UpdateBugNotesDto } from './dto/update-bug-notes.dto';
import { BugStatus } from 'src/repository/bug/bug.entity';

@Controller('v1')
export class BugController {
    constructor(private readonly bugService: BugService) { }

    @UseGuards(AuthGuard)
    @Post('bugs')
    create(
        @Body() dto: CreateBugDto,
        @User() user: { sub: number },
        @Req() req: Request,
    ) {
        const userAgent = req.headers['user-agent'] ?? null;
        return this.bugService.create(dto, user.sub, userAgent);
    }

    @UseGuards(AdminGuard)
    @Get('admin/bugs')
    list(
        @Query('page') page = '1',
        @Query('limit') limit = '20',
        @Query('status') status?: BugStatus,
    ) {
        return this.bugService.list(Number(page), Number(limit), status);
    }

    @UseGuards(AdminGuard)
    @Get('admin/bugs/stats')
    stats() {
        return this.bugService.getStats();
    }

    @UseGuards(AdminGuard)
    @Get('admin/bugs/:id')
    getById(@Param('id', ParseIntPipe) id: number) {
        return this.bugService.getById(id);
    }

    @UseGuards(AdminGuard)
    @Patch('admin/bugs/:id/status')
    updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBugStatusDto,
    ) {
        return this.bugService.updateStatus(id, dto.status);
    }

    @UseGuards(AdminGuard)
    @Patch('admin/bugs/:id/notes')
    updateNotes(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBugNotesDto,
    ) {
        return this.bugService.updateNotes(id, dto.notasInternas);
    }
}
