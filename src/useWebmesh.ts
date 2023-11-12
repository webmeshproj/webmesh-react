import { useState, useEffect } from 'react';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import {
    DaemonClient,
    Options,
    DefaultNamespace,
    DefaultDaemonAddress,
} from '@webmeshproject/api/utils/daemon';

/**
 * DaemonOptions are options for connecting to a daemon process.
 */
export class DaemonOptions extends Options {
    constructor(opts?: Partial<DaemonOptions>) {
        if (!opts) {
            opts = Options.defaults();
        }
        opts.transport = createGrpcWebTransport({
            baseUrl: opts.daemonAddress || DefaultDaemonAddress,
            interceptors: [
                Options.interceptor(opts.namespace || DefaultNamespace),
            ],
        });
        super(opts);
    }
}

/**
 * useWebmesh is a hook for interacting with a webmesh daemon.
 */
export function useWebmesh(opts?: Partial<DaemonOptions>) {};
