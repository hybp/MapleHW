import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from './roles.enum';
export interface JwtPayload {
    sub: string;
    username: string;
    role: Role;
    iat?: number;
    exp?: number;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    constructor(configService: ConfigService);
    validate(payload: JwtPayload): Promise<any>;
}
export {};
