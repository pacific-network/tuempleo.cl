import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Planes } from "../../repository/plans/plans.entity";
import { CreatePlansDto } from "./dto/create-plan.dto";
import { UpdatePlansDto } from "./dto/update-plan.dto";

@Injectable()
export class PlansService {
    constructor(
        @InjectRepository(Planes)
        private readonly plansRepository: Repository<Planes>,
    ) { }

    public async getAllPlans(): Promise<Planes[]> {
        return this.plansRepository.find();
    }

    public async getPlanById(id: number): Promise<Planes> {
        const plan = await this.plansRepository.findOne({ where: { id } })
        if (!plan) {
            throw new Error('Plan no encontrado');
        }
        return plan;
    }

    public async createPlan(createPlansDto: CreatePlansDto): Promise<Planes> {
        const plan = this.plansRepository.create(createPlansDto);
        return this.plansRepository.save(plan);
    }

    public async updatePlan(id: number, updatePlansDto: UpdatePlansDto): Promise<Planes> {
        const plan = await this.getPlanById(id);
        if (!plan) {
            throw new Error('Plan no encontrado');
        }
        Object.assign(plan, updatePlansDto);
        return this.plansRepository.save(plan);
    }


}
