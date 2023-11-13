import { useState, useEffect } from 'react';
import { createGrpcWebTransport } from '@connectrpc/connect-web';
import {
    GetConnectionResponse,
    PutConnectionResponse,
    DaemonConnStatus,
    DaemonStatus,
    ListConnectionsResponse,
} from '@webmeshproject/api/v1/app_pb';
import {
    DaemonClient,
    Options,
    DefaultNamespace,
    DefaultDaemonAddress,
} from '@webmeshproject/api/utils/daemon';
import {
    Metrics,
    Network,
    NetworkParameters,
    Parameters,
} from '@webmeshproject/api/utils/networks';

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
    /**
     * putNetwork creates a new network connection.
     */
    putNetwork(opts: NetworkParameters): Promise<Network>;
    /**
     * getNetwork returns the network connection with the given ID.
     * It is a convenience method for finding and refreshing the status
     * of a network.
     */
    getNetwork(id: string): Promise<Network>;
    /**
     * DropNetwork disconnects and deletes all data for the connection with the given ID.
     */
    dropNetwork(id: string): Promise<void>;
    /**
     * connect creates a new connection to a network. It is semantically equivalent to
     * calling PutNetwork followed by Connect on the returned network. If no parameters
     * are given, the connection with the given ID is connected.
     */
    connect(opts: Parameters): Promise<Network>;
    /**
     * disconnect disconnects the network with the given ID.
     */
    disconnect(id: string): Promise<void>;
    /**
     * deviceMetrics returns a reference to the current device metrics for the network
     * with the given ID. If pollInterval is provided, the metrics will be polled at
     * the given interval, otherwise it defaults to a 5 second interval. The polling
     * will stop when the component is unmounted.
     */
    deviceMetrics(id: string, pollInterval?: number): Metrics;
}

/**
 * useWebmesh is a hook for interacting with a webmesh daemon.
 */
export function useWebmesh(opts?: Partial<DaemonOptions>) {
    const [client, setClient] = useState<DaemonClient>(
        new DaemonOptions(opts).client(),
    );
    const [networks, setNetworks] = useState<Network[]>([]);
    const [error, setError] = useState<Error | undefined>(undefined);

    const upsertNetwork = (conn: Network) => {
        const i = networks.findIndex((c) => c.id === conn.id);
        if (i >= 0) {
            networks.splice(i, 1, conn);
        } else {
            networks.push(conn);
        }
        setNetworks(networks);
    };

    const removeNetwork = (id: string) => {
        const i = networks.findIndex((c) => c.id === id);
        if (i >= 0) {
            networks.splice(i, 1);
        }
        setNetworks(networks);
    };

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

    const putNetwork = (params: NetworkParameters): Promise<Network> => {
        return new Promise((resolve, reject) => {
            client
                .putConnection({
                    id: params.id,
                    parameters: params.params,
                    metadata: params.meta,
                })
                .then((res: PutConnectionResponse) => {
                    const conn = new Network(client, res.id, {
                        status: DaemonConnStatus.DISCONNECTED,
                        parameters: params.params,
                        metadata: params.meta,
                    } as GetConnectionResponse);
                    upsertNetwork(conn);
                    resolve(conn);
                })
                .catch((err: Error) => {
                    reject(err);
                });
        });
    };

    const getNetwork = (id: string): Promise<Network> => {
        return new Promise((resolve, reject) => {
            client
                .getConnection({ id: id })
                .then((res: GetConnectionResponse) => {
                    const conn = new Network(client, id, res);
                    upsertNetwork(conn);
                    resolve(conn);
                })
                .catch((err: Error) => {
                    reject(err);
                });
        });
    };

    const connect = (params: Parameters): Promise<Network> => {
        return new Promise((resolve, reject) => {
            if (params.meta || params.params) {
                putNetwork(params as NetworkParameters)
                    .then((conn: Network) => {
                        conn.connect()
                            .then(() => resolve(conn))
                            .catch((err: Error) => {
                                reject(err);
                            });
                    })
                    .catch((err: Error) => {
                        reject(err);
                    });
            } else if (params.id) {
                getNetwork(params.id)
                    .then((conn: Network) => {
                        conn.connect()
                            .then(() => resolve(conn))
                            .catch((err: Error) => {
                                reject(err);
                            });
                    })
                    .catch((err: Error) => {
                        reject(err);
                    });
            } else {
                reject(new Error('no connection parameters provided'));
            }
        });
    };

    const disconnect = (id: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            getNetwork(id)
                .then((conn: Network) => {
                    conn.disconnect()
                        .then(() => resolve())
                        .catch((err: Error) => {
                            reject(err);
                        });
                })
                .catch((err: Error) => reject(err));
        });
    };

    const dropNetwork = (id: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            getNetwork(id)
                .then((conn: Network) => {
                    conn.drop()
                        .then(() => {
                            removeNetwork(id);
                            resolve();
                        })
                        .catch((err: Error) => {
                            reject(err);
                        });
                })
                .catch((err: Error) => reject(err))
                .finally(() => {
                    removeNetwork(id);
                });
        });
    };

    const deviceMetrics = (id: string, pollInterval?: number): Metrics => {
        const [metrics, setMetrics] = useState<Metrics>({} as Metrics);
        const interval = setInterval(() => {
            const conn = networks.find((c) => c.id === id);
            if (!conn) {
                return;
            }
            if (!conn.connected) {
                return;
            }
            conn.metrics()
                .then((metrics: Metrics) => {
                    setMetrics(metrics);
                })
                .catch((err: Error) => {
                    setError(err);
                });
        }, pollInterval || 5000);
        useEffect(() => {
            return () => {
                clearInterval(interval);
            };
        }, []);
        return metrics;
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
        interval = setInterval(
            () => {
                listNetworks().catch((err: Error) => {
                    setError(err);
                });
            },
            opts?.pollInterval || 5000,
        );
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [opts]);

    return {
        client,
        networks,
        error,
        daemonStatus,
        listNetworks,
        putNetwork,
        getNetwork,
        dropNetwork,
        connect,
        disconnect,
        deviceMetrics,
    } as Context;
}
