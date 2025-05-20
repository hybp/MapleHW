import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Role } from '../auth/roles.enum';
interface AuthenticatedGatewayRequest extends ExpressRequest {
    user?: {
        userId: string;
        username: string;
        role: Role;
    };
}
export declare class ProxyController {
    private httpService;
    private configService;
    private readonly logger;
    private authServiceUrl;
    private eventServiceUrl;
    constructor(httpService: HttpService, configService: ConfigService);
    private proxyRequest;
    proxyToAuth(req: AuthenticatedGatewayRequest, res: ExpressResponse): Promise<void>;
    proxyToEventServiceEventsBase(req: AuthenticatedGatewayRequest, res: ExpressResponse): Promise<void>;
    proxyToEventServiceEventsWildcard(req: AuthenticatedGatewayRequest, res: ExpressResponse): Promise<void>;
    proxyToEventServiceRewardsBase(req: AuthenticatedGatewayRequest, res: ExpressResponse): Promise<void>;
    proxyToEventServiceRewardsWildcard(req: AuthenticatedGatewayRequest, res: ExpressResponse): Promise<void>;
    proxyToEventServiceRequestsBase(req: AuthenticatedGatewayRequest, res: ExpressResponse): Promise<void>;
    proxyToEventServiceRequestsWildcard(req: AuthenticatedGatewayRequest, res: ExpressResponse): Promise<void>;
}
export {};
