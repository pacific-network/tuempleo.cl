//src/config/database.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { Postulacion } from 'src/repository/applications/applications.entity';
import { Empresa } from 'src/repository/business/business.entity';
import { Curriculum } from 'src/repository/curriculum/curriculum.entity';
import { Empleador } from 'src/repository/employer/employer.entity';
import { ProcesoSeleccion } from 'src/repository/hiring_process/hiring_process.entity';
import { Oferta } from 'src/repository/job_offer/job-offer.entity';
import { Planes } from 'src/repository/plans/plans.entity';
import { Postulante } from 'src/repository/postulant/postulant.entity';
import { Registro } from 'src/repository/register/register.entity';
import { Rol } from 'src/repository/role/role.entity';
import { ShoppingCart } from 'src/repository/shopping/shopping.entity';
import { Transaction } from 'src/repository/transaction/transaction.entity';
import { Usuario } from 'src/repository/user/user.entity';
import { TrabajoGuardado } from 'src/repository/saved-job/saved-job.entity';
import { CompanyReview } from 'src/modules/company-reviews/entities/company-review.entity';
import { EmployerPlanLedger } from 'src/modules/publication/entities/employer-plan-ledger.entity';
import { OfferPolicy } from 'src/modules/publication/entities/offer-policy.entity';
import { TransactionItem } from 'src/repository/transaction_items/transaction-items.entity';
import { Stock } from 'src/repository/stock/stock.entity';
import { PaymentIntent } from 'src/modules/publication/entities/payment-intent.entity';
import { CountVisit } from 'src/repository/count_visits/count-visits.entity';
import { CuposUsados } from 'src/repository/used_quota/used_quota.entity';
import { StockGratis } from 'src/repository/free_stock/free-stock.entity';
import { Sms } from 'src/repository/sms/sms.entity';
import { Region } from 'src/repository/catalog/region.entity';
import { Comuna } from 'src/repository/catalog/commune.entity';
import { WorkArea } from 'src/repository/catalog/work-area.entity';
import { InstitucionEducacional } from 'src/repository/catalog/educational-institution.entity';
import { BusinessActivity } from 'src/repository/catalog/company_activity';
import { Mail } from 'src/repository/mail/mail.entity';
import { AlertaEmpleo } from 'src/repository/alerta-empleo/alerta-empleo.entity';
import { InvitacionEmpleador } from 'src/repository/invitacion-empleador/invitacion-empleador.entity';
import { LegalDocument } from 'src/repository/legal/legal-document.entity';
import { ConsentRecord } from 'src/repository/legal/consent-record.entity';
import { AccountDeletionLog } from 'src/repository/legal/account-deletion-log.entity';
import { Bug } from 'src/repository/bug/bug.entity';
import { SystemAlert } from 'src/repository/system-alert/system-alert.entity';
import { Promocion } from 'src/repository/promocion/promocion.entity';

// Cargar variables de entorno
dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    password: process.env.DB_PASSWORD || '',
    username: process.env.DB_USERNAME || 'root',
    database: process.env.DB_NAME || 'tuempleo',
    entities: [Registro, Rol, Usuario, Postulante,
        Curriculum, Planes, Empresa, Empleador, Oferta, Postulacion,
        Transaction, ShoppingCart, ProcesoSeleccion, TrabajoGuardado, CompanyReview, EmployerPlanLedger, OfferPolicy, TransactionItem, Stock, PaymentIntent, CountVisit, CuposUsados, StockGratis, Sms, Region, Comuna, WorkArea, InstitucionEducacional, BusinessActivity, Mail, AlertaEmpleo, InvitacionEmpleador, LegalDocument, ConsentRecord, AccountDeletionLog, Bug, SystemAlert, Promocion],
    // logging: true,
    synchronize: process.env.DB_SYNCHRONIZE === 'false',

};
