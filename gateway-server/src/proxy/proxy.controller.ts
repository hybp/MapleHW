import { Controller, All, Request, Response, UseGuards, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { randomUUID } from 'crypto';
import { Role } from '../auth/roles.enum'; // Import Role if needed for type checking req.user.role

// Define custom header names
const HEADER_USER_ID = 'x-user-id';
const HEADER_USER_ROLE = 'x-user-role';
const HEADER_USER_PAYLOAD = 'x-user-payload'; // Existing one

interface AuthenticatedGatewayRequest extends ExpressRequest {
  user?: {
    userId: string;
    username: string;
    role: Role; // Assuming Role enum is used
  };
}

@Controller()
// Apply JwtAuthGuard at the controller level if all routes are protected.
// If some routes in this controller are public and then call this.proxyRequest, 
// the guard needs to be at method level or this.proxyRequest needs to handle req.user being undefined.
// Current setup applies it at controller level, so req.user should always be defined in proxyRequest.
@UseGuards(JwtAuthGuard)
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private authServiceUrl: string;
  private eventServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    // These are expected to be set by docker-compose.yml or .env file
    this.authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL')!;
    this.eventServiceUrl = this.configService.get<string>('EVENT_SERVICE_URL')!;

    if (!this.authServiceUrl) {
      throw new InternalServerErrorException('인증 서비스 URL이 설정되지 않았습니다.');
    }
    if (!this.eventServiceUrl) {
      throw new InternalServerErrorException('이벤트 서비스 URL이 설정되지 않았습니다.');
    }
  }

  private async proxyRequest(
    // Use the extended request type
    req: AuthenticatedGatewayRequest, 
    res: ExpressResponse,
    targetUrl: string,
  ) {
    const { method, body, headers: originalClientHeaders, originalUrl } = req;
    let serviceUrl = `${targetUrl}${originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`}`;

    // Special handling for /auth/login and /auth/register which should not have /auth prefix in auth-service
    if (targetUrl === this.authServiceUrl && (originalUrl.startsWith('/auth/login') || originalUrl.startsWith('/auth/register') || originalUrl.startsWith('/auth/profile') || originalUrl.startsWith('/auth/users'))) {
      serviceUrl = `${targetUrl}${originalUrl.substring('/auth'.length)}`;
    }

    this.logger.log(`Proxying request: ${method} ${serviceUrl}`);

    const forwardedHeaders: Record<string, string> = {};

    // Copy non-sensitive and relevant headers from original client request
    // Avoid copying sensitive headers or those that should be set by the gateway (e.g., Host, Connection)
    // Explicitly copy allowed headers like authorization, content-type, accept, etc.
    if (originalClientHeaders.authorization) {
      forwardedHeaders['authorization'] = originalClientHeaders.authorization as string;
    }
    if (originalClientHeaders['content-type']) {
        forwardedHeaders['content-type'] = originalClientHeaders['content-type'] as string;
    }
    // Add other headers you want to forward, e.g., 'accept', 'accept-language', etc.

    // Set x-request-id (either forwarded or newly generated)
    // Do not allow client to set our trusted headers directly
    forwardedHeaders['x-request-id'] = (originalClientHeaders['x-request-id'] as string) || randomUUID();

    // Add trusted user information headers from validated JWT payload
    // req.user is populated by JwtAuthGuard from gateway's JwtStrategy
    if (req.user && req.user.userId && req.user.role) {
      forwardedHeaders[HEADER_USER_ID] = req.user.userId;
      forwardedHeaders[HEADER_USER_ROLE] = req.user.role;
      // Keep the full payload for now, can be removed if specific headers are sufficient
      forwardedHeaders[HEADER_USER_PAYLOAD] = JSON.stringify(req.user);
      this.logger.debug(`Forwarding user context: ID=${req.user.userId}, Role=${req.user.role}`);
    } else {
        // This case should ideally not be reached if JwtAuthGuard is applied at controller level and works correctly.
        // If it can be reached (e.g. public routes also use this proxy method), 
        // then downstream services must handle missing user headers.
        this.logger.warn('req.user not found or incomplete in gateway while proxying. No user context forwarded.');
    }

    const axiosConfig: AxiosRequestConfig = {
      method: method as Method,
      url: serviceUrl,
      data: body,
      headers: forwardedHeaders,
      validateStatus: () => true, 
    };

    try {
      const serviceResponse = await firstValueFrom(this.httpService.request(axiosConfig));
      res.status(serviceResponse.status).json(serviceResponse.data);
    } catch (error) {
      this.logger.error(`Error proxying to ${serviceUrl}:`, error.stack);
      if (error instanceof AxiosError && error.response) {
        // Try to forward the downstream service's error message if available
        const message = error.response.data?.message || error.response.data || '다운스트림 서비스에서 오류가 발생했습니다.';
        res.status(error.response.status || 500).json({ statusCode: error.response.status || 500, message });
      } else if (error instanceof AxiosError && error.request) {
        res.status(504).json({ message: '게이트웨이 타임아웃: 업스트림 서비스로부터 응답이 없습니다.' });
      } else {
        res.status(500).json({ message: '내부 게이트웨이 오류가 발생했습니다.' });
      }
    }
  }

  @All('/auth/*')
  proxyToAuth(@Request() req: AuthenticatedGatewayRequest, @Response() res: ExpressResponse) {
    return this.proxyRequest(req, res, this.authServiceUrl);
  }

  // Adjusted to match PRD: /events, /events/:id, etc.
  // The * in @All matches the base path and anything after it.
  @All('/events')
  proxyToEventServiceEventsBase(@Request() req: AuthenticatedGatewayRequest, @Response() res: ExpressResponse) {
    return this.proxyRequest(req, res, this.eventServiceUrl);
  }
  @All('/events/*')
  proxyToEventServiceEventsWildcard(@Request() req: AuthenticatedGatewayRequest, @Response() res: ExpressResponse) {
    return this.proxyRequest(req, res, this.eventServiceUrl);
  }

  // POST /events/:eventId/rewards -> should go to event server at /events/:eventId/rewards
  // GET /events/:eventId/rewards -> should go to event server at /events/:eventId/rewards
  // GET /rewards/:id -> should go to event server at /rewards/:id
  // PUT /rewards/:id -> should go to event server at /rewards/:id
  // DELETE /rewards/:id -> should go to event server at /rewards/:id
  // The event server controllers are already set up for these paths directly (not nested under /rewards)
  // So, /rewards/* from gateway should map to /rewards/* on event server.
  @All('/rewards')
  proxyToEventServiceRewardsBase(@Request() req: AuthenticatedGatewayRequest, @Response() res: ExpressResponse) {
    return this.proxyRequest(req, res, this.eventServiceUrl);
  }
  @All('/rewards/*')
  proxyToEventServiceRewardsWildcard(@Request() req: AuthenticatedGatewayRequest, @Response() res: ExpressResponse) {
    return this.proxyRequest(req, res, this.eventServiceUrl);
  }

  // POST /events/:eventId/request -> event server /events/:eventId/request
  // GET /requests/me -> event server /requests/me
  // GET /requests -> event server /requests
  // GET /requests/:id -> event server /requests/:id
  // PATCH /requests/:id/status -> event server /requests/:id/status
  @All('/requests')
  proxyToEventServiceRequestsBase(@Request() req: AuthenticatedGatewayRequest, @Response() res: ExpressResponse) {
    return this.proxyRequest(req, res, this.eventServiceUrl);
  }
  @All('/requests/*')
  proxyToEventServiceRequestsWildcard(@Request() req: AuthenticatedGatewayRequest, @Response() res: ExpressResponse) {
    return this.proxyRequest(req, res, this.eventServiceUrl);
  }
} 
 
 