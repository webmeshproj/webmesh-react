import { useState, useEffect } from "react";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import {
    GetConnectionResponse,
    PutConnectionResponse,
    DaemonConnStatus,
    DaemonStatus,
    ListConnectionsResponse,
} from "@webmeshproject/api/v1/app_pb";
import {
    DaemonClient,
    Options,
    DefaultNamespace,
    DefaultDaemonAddress,
} from "@webmeshproject/api/utils/daemon";
import { Network } from "@webmeshproject/api/utils/networks";

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
 * Context is the context for interacting with a webmesh daemon.
 */
export interface Context {
    /**
     * client is the daemon client.
     */
    client: DaemonClient;
    /**
     * networks is the list of networks.
     */
    networks: Network[];
    /**
     * error is an error that occurred during polling, if any.
     */
    error?: Error;
    /**
     * daemonStatus returns the current status of the daemon.
     */
    daemonStatus(): Promise<DaemonStatus>;
    /**
     * listNetworks returns the current list of networks.
     */
    listNetworks(): Promise<Network[]>;
}

/**
 * useWebmesh is a hook for interacting with a webmesh daemon.
 */
export function useWebmesh(opts?: Partial<DaemonOptions>) {
    const [client, setClient] = useState<DaemonClient>(new DaemonOptions(opts).client());
    const [networks, setNetworks] = useState<Network[]>([]);
    const [error, setError] = useState<Error | undefined>(undefined);

    const daemonStatus = (): Promise<DaemonStatus> => {
        return new Promise((resolve, reject) => {
            client
                .status({})
                .then((resp: DaemonStatus) => {
                    resolve(resp);
                })
                .catch((err: Error) => {
                    reject(err);
                });
        });
    };

    const listNetworks = (): Promise<Array<Network>> => {
        return new Promise((resolve, reject) => {
            const data = new Array<Network>();
            client
                .listConnections({})
                .then((resp: ListConnectionsResponse) => {
                    for (const [id, conn] of Object.entries(resp.connections)) {
                        const c = new Network(client, id, conn);
                        data.push(c);
                    }
                    setNetworks(data);
                    resolve(data);
                })
                .catch((err: Error) => {
                    reject(err);
                });
        });
    };

    let interval: NodeJS.Timeout;
    useEffect(() => {
        if (interval) {
            clearInterval(interval);
        }
        const client = new DaemonOptions(opts).client();
        setClient(client);
        listNetworks().catch((err: Error) => {
            setError(err);
        });
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [opts]);

    return { client, networks, error, daemonStatus, listNetworks } as Context;
}
