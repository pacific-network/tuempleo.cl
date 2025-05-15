import { Controller, Post, Get, Param, Body, BadRequestException } from "@nestjs/common";
import { PlansService } from "./plans.service";
import { Planes } from "../../repository/plans/plans.entity";
import { CreatePlansDto } from "./dto/create-plan.dto";
@Controller('v1/plans')
export class PlansController {
    constructor(private readonly plansService: PlansService) { }

    @Get()
    public async getAllPlans(): Promise<Planes[]> {
        return this.plansService.getAllPlans();
    }

    @Get(':id')
    public async getPlanById(@Param('id') id: number): Promise<Planes> {
        const plan = await this.plansService.getPlanById(id);
        if (!plan) {
            throw new BadRequestException('Plan no encontrado');
        }
        return plan;
    }
    
    @Post()
    public async createPlan(@Body() createPlansDto: CreatePlansDto): Promise<Planes> {
        const plan = await this.plansService.createPlan(createPlansDto);
        if (!plan) {
            throw new BadRequestException('Error al crear el plan');
        }
        return plan;
    }
}