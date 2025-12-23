import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class LinkedinOAuthGuard extends AuthGuard('linkedin') {
    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest()

        return {
            state: req.query.state,
        }
    }
}
