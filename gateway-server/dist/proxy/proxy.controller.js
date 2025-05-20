"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ProxyController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyController = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const axios_2 = require("axios");
const rxjs_1 = require("rxjs");
const crypto_1 = require("crypto");
const HEADER_USER_ID = 'x-user-id';
const HEADER_USER_ROLE = 'x-user-role';
const HEADER_USER_PAYLOAD = 'x-user-payload';
let ProxyController = ProxyController_1 = class ProxyController {
    httpService;
    configService;
    logger = new common_1.Logger(ProxyController_1.name);
    authServiceUrl;
    eventServiceUrl;
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.authServiceUrl = this.configService.get('AUTH_SERVICE_URL');
        this.eventServiceUrl = this.configService.get('EVENT_SERVICE_URL');
        if (!this.authServiceUrl) {
            throw new common_1.InternalServerErrorException('AUTH_SERVICE_URL not configured');
        }
        if (!this.eventServiceUrl) {
            throw new common_1.InternalServerErrorException('EVENT_SERVICE_URL not configured');
        }
    }
    async proxyRequest(req, res, targetUrl) {
        const { method, body, headers: originalClientHeaders, originalUrl } = req;
        let serviceUrl = `${targetUrl}${originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`}`;
        if (targetUrl === this.authServiceUrl && (originalUrl.startsWith('/auth/login') || originalUrl.startsWith('/auth/register') || originalUrl.startsWith('/auth/profile') || originalUrl.startsWith('/auth/users'))) {
            serviceUrl = `${targetUrl}${originalUrl.substring('/auth'.length)}`;
        }
        this.logger.log(`Proxying request: ${method} ${serviceUrl}`);
        const forwardedHeaders = {};
        if (originalClientHeaders.authorization) {
            forwardedHeaders['authorization'] = originalClientHeaders.authorization;
        }
        if (originalClientHeaders['content-type']) {
            forwardedHeaders['content-type'] = originalClientHeaders['content-type'];
        }
        forwardedHeaders['x-request-id'] = originalClientHeaders['x-request-id'] || (0, crypto_1.randomUUID)();
        if (req.user && req.user.userId && req.user.role) {
            forwardedHeaders[HEADER_USER_ID] = req.user.userId;
            forwardedHeaders[HEADER_USER_ROLE] = req.user.role;
            forwardedHeaders[HEADER_USER_PAYLOAD] = JSON.stringify(req.user);
            this.logger.debug(`Forwarding user context: ID=${req.user.userId}, Role=${req.user.role}`);
        }
        else {
            this.logger.warn('req.user not found or incomplete in gateway while proxying. No user context forwarded.');
        }
        const axiosConfig = {
            method: method,
            url: serviceUrl,
            data: body,
            headers: forwardedHeaders,
            validateStatus: () => true,
        };
        try {
            const serviceResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.request(axiosConfig));
            res.status(serviceResponse.status).json(serviceResponse.data);
        }
        catch (error) {
            this.logger.error(`Error proxying to ${serviceUrl}:`, error.stack);
            if (error instanceof axios_2.AxiosError && error.response) {
                res.status(error.response.status || 500).json(error.response.data || 'Proxy error');
            }
            else if (error instanceof axios_2.AxiosError && error.request) {
                res.status(504).json({ message: 'Gateway timeout - No response from upstream service' });
            }
            else {
                res.status(500).json({ message: 'Internal Gateway Error' });
            }
        }
    }
    proxyToAuth(req, res) {
        return this.proxyRequest(req, res, this.authServiceUrl);
    }
    proxyToEventServiceEventsBase(req, res) {
        return this.proxyRequest(req, res, this.eventServiceUrl);
    }
    proxyToEventServiceEventsWildcard(req, res) {
        return this.proxyRequest(req, res, this.eventServiceUrl);
    }
    proxyToEventServiceRewardsBase(req, res) {
        return this.proxyRequest(req, res, this.eventServiceUrl);
    }
    proxyToEventServiceRewardsWildcard(req, res) {
        return this.proxyRequest(req, res, this.eventServiceUrl);
    }
    proxyToEventServiceRequestsBase(req, res) {
        return this.proxyRequest(req, res, this.eventServiceUrl);
    }
    proxyToEventServiceRequestsWildcard(req, res) {
        return this.proxyRequest(req, res, this.eventServiceUrl);
    }
};
exports.ProxyController = ProxyController;
__decorate([
    (0, common_1.All)('/auth/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProxyController.prototype, "proxyToAuth", null);
__decorate([
    (0, common_1.All)('/events'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProxyController.prototype, "proxyToEventServiceEventsBase", null);
__decorate([
    (0, common_1.All)('/events/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProxyController.prototype, "proxyToEventServiceEventsWildcard", null);
__decorate([
    (0, common_1.All)('/rewards'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProxyController.prototype, "proxyToEventServiceRewardsBase", null);
__decorate([
    (0, common_1.All)('/rewards/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProxyController.prototype, "proxyToEventServiceRewardsWildcard", null);
__decorate([
    (0, common_1.All)('/requests'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProxyController.prototype, "proxyToEventServiceRequestsBase", null);
__decorate([
    (0, common_1.All)('/requests/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProxyController.prototype, "proxyToEventServiceRequestsWildcard", null);
exports.ProxyController = ProxyController = ProxyController_1 = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], ProxyController);
//# sourceMappingURL=proxy.controller.js.map