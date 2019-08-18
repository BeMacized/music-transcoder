import 'reflect-metadata';
import { ReflectiveInjector, Injectable, Provider } from 'injection-js';
import { OnInit } from './utils/generic';
import * as winston from 'winston';
import dotenv from 'dotenv';
import {AudioConverter} from "./audio_converter";

// Configure dotenv
dotenv.config();

// Configure logging
winston.configure({
    level: 'debug',
    format: winston.format.cli(),
    transports: [
        new winston.transports.Console({
            level: 'debug'
        }),
        new winston.transports.File({
            filename: 'combined.log',
            level: 'info'
        }),
        new winston.transports.File({
            filename: 'errors.log',
            level: 'error'
        })
    ]
});

// Handle unhandled promise rejections
process.on('unhandledRejection', error => winston.warn('unhandledRejection ' + error));

// Define providers
const providers = [AudioConverter] as Provider[];

// Create injector
const injector = ReflectiveInjector.resolveAndCreate(providers);

// Call onInit of providers
(async () => {
    const inits = providers
        .map(provider => injector.get(provider))
        .filter(provider => !!provider.onInit)
        .map(provider => provider.onInit.bind(provider));
    for (const init of inits) await init();
})();
