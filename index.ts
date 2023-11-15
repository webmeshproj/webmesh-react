import { Feature } from '@webmeshproject/api/v1/node_pb';
import { AppDaemon } from '@webmeshproject/api/v1/app_connect';
import {
    NetworkAuthMethod,
    ConnectionParameters_AddrType as AddrType,
    ConnectionParameters_AuthHeader as AuthHeader,
    MeshConnBootstrap_DefaultNetworkACL as DefaultNetworkACL,
    DaemonConnStatus as ConnectionStatus,
    DaemonStatus,
} from '@webmeshproject/api/v1/app_pb';

import {
    Defaults,
    Network,
    NetworkParameters,
    Parameters,
    Metrics,
} from '@webmeshproject/api/utils/networks';
import {
    DaemonClient,
    Options,
    DefaultNamespace,
    DefaultDaemonAddress,
} from '@webmeshproject/api/utils/daemon';

import { DaemonOptions, Context, useWebmesh } from './src/useWebmesh';

export type {
    AddrType,
    AuthHeader,
    ConnectionStatus,
    DefaultNetworkACL,
    Feature,
    NetworkAuthMethod,
};

export type { Context, DaemonClient, Metrics, NetworkParameters, Parameters };

export {
    AppDaemon,
    DefaultNamespace,
    DefaultDaemonAddress,
    DaemonOptions,
    DaemonStatus,
    Defaults,
    Options,
    Network,
    useWebmesh,
};
