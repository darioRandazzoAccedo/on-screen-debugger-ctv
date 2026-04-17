/* eslint-disable max-classes-per-file */
/* eslint-disable lines-between-class-members */
declare module '@accedo/xdk-config' {
  type Network = {
    polling: {
      interval: unknown; // int?
      url: unknown; // string?
    };
  };
  type Configuration = {
    type: unknown;
    importer: unknown;
  };

  type DeviceConfigParams = {
    id: string;
    detection: () => void;
    defaultConfig: () => void;
    DevicePackage: () => void;
  };

  type Keymapping = {
    chars?: object;
    keys?: object;
  };

  export class DeviceConfig {
    [x: string]: any;
    constructor(params: DeviceConfigParams);
    id: string;
    detection: () => void;
    defaultConfig: () => void;
    DevicePackage: () => void;
    addPlayer: (playerConfig: unknown, config: unknown) => this;
    overrideDetection: (detection: () => void) => this;
    forceDetection: (force: boolean) => this;
    replaceNetwork: (network: Network) => this;
    addExtension: (extension: Configuration) => this;
    addStorage: (storage: Configuration) => this;
    setKeyMapping: (keymapping: Keymapping) => this;
  }

  type PlayerConfigParams = {
    id: string;
    importer?: () => unknown;
    extensions?: unknown[];
    config?: unknown;
  };

  export class PlayerConfig {
    constructor(params: PlayerConfigParams);
    default: boolean;
  }

  type PlayerExtensionConfigParams = {
    type: 'subtitle' | 'audio-track' | 'drm';
    importer: () => unknown;
    config: unknown;
  };

  export class PlayerExtensionConfig {
    constructor(params: PlayerExtensionConfigParams);
    default: boolean;
  }

  const xdkConfig: {
    KEY: {
      DEVICE_DEFAULT_CONFIG_KEY: string;
      DEVICE_PACKAGES_INFO_KEY: string;
      NETWORK: 'network';
      PLAYERS: 'players';
      STORAGES: 'storages';
      EXTENSIONS: 'extensions';
      MOUSE: 'mouse';
      MEDIA: 'media';
    };
    load: (config: any) => void;
    get: (key: string, defaultValue: any) => any;
    set: (key: string, value: any) => void;
  };

  export default xdkConfig;
}
