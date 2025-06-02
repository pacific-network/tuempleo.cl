import { Test, TestingModule } from '@nestjs/testing';
import { PostulacionService } from './application.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Postulacion } from '../../repository/applications/applications.entity';
import { Repository } from 'typeorm';
import { ApplicationModule } from './application.module';

describe('PostulacionService', () => {
    let service: PostulacionService;
    let repo: Repository<Postulacion>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApplicationModule,
                PostulacionService,
                {
                    provide: getRepositoryToken(Postulacion),
                    useClass: Repository,
                },
            ],
        }).compile();

        service = module.get<PostulacionService>(PostulacionService);
        repo = module.get<Repository<Postulacion>>(getRepositoryToken(Postulacion));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // Ejemplo: test de método
    // it('should create a postulacion', async () => {
    //   // tu mock y test aquí
    // });
});
