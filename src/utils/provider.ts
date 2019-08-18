import * as winston from 'winston';

export abstract class Provider {
    debug = (...value: any[]) => {
        winston.debug(`[${this.constructor.name}] ` + value.map(v => v.toString()).join(' '));
    };
    info = (...value: any[]) => {
        winston.info(`[${this.constructor.name}] ` + value.map(v => v.toString()).join(' '));
    };
    warn = (...value: any[]) => {
        winston.warn(`[${this.constructor.name}] ` + value.map(v => v.toString()).join(' '));
    };
    error = (...value: any[]) => {
        winston.error(`[${this.constructor.name}] ` + value.map(v => v.toString()).join(' '));
    };
}
