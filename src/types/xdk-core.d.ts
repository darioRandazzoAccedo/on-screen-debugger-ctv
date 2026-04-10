declare module '@accedo/xdk-core' {

  type Environment = {
    dispatchEvent: (
      type: string,
      data: object,
      handleError: boolean,
    ) => boolean;
    addEventListener: (
      event: string,
      callback: (...args: any) => void,
      once?: boolean,
    ) => void;
    removeEventListener: (
      event: string,
      callback: (...args: any) => void,
    ) => void;
    removeAllListeners: () => void;
    deinit: () => void;
    SYSTEM: {
      LOAD: 'system:load';
      UNLOAD: 'system:unload';
      KEYDOWN: 'system:key:down';
      KEYPRESS: 'system:key:press';
      KEYUP: 'system:key:up';
      MOUSEON: 'system:key:mouseon';
      MOUSEOFF: 'system:key:mouseoff';
      SUSPEND: 'system:suspend';
      RESUME: 'system:resume';
      RESIZE: 'system:resize';
      NETWORK_STATUS_CHANGED: 'system:network-status-changed';
      ERROR: 'system:system-error';
    };
    MEDIA: {
      BUFFERING: 'media:buffering';
      FINISHED: 'media:finished';
      STATE_CHANGED: 'media:state-changed';
      TIME_UPDATE: 'media:time-update';
      ERROR: 'media:error';
      SPEED: 'media:speed';
    };
    DEVICE: {
      ONDETECT: 'device:ondetect';
      ONLOAD: 'device:onload';
      ONUNLOAD: 'device:onunload';
      ERROR: 'device:error';
    };
  };

  export type EventArg = {
    type: string;
    stopImmediatePropagation: () => void;
  };

  export type Handler<DataType = any> = (data: DataType, event: Event) => void;

  type AppResolution = {
    width: number;
    height: number;
  };

  type Network = {
    _networkType: string;
    getIP(): string;
  };

  export type System = {
    getNetwork(): Network;
    getModel: () => string;
    getFirmwareVersion: () => string;
    getDeviceType: () => string;
    getDeviceYear: () => number;
    getDeviceResolution: () => AppResolution;
    getAppResolution: () => AppResolution;
    getLocation: () => any;
    getCountry: () => any;
    getUniqueId: () => Promise<string>;
    getSdkVersion?: () => string;
    is3DSupported: () => boolean;
    isHDRTVSupported: () => boolean;
    isUHD: () => boolean;
    isMultiscreenSupported: () => boolean;
    isScreenSaverSupported: () => boolean;
    isMuteSupported: () => boolean;
    isLaunchAppSupported: () => boolean;
    isSuspendSupported: () => boolean;
    isResumeSupported: () => boolean;
    isVolumeChangeSupported: () => boolean;
    isSSLSupported: () => boolean;
    isMouseSupported: () => boolean;
    isHardwareKeyboardSupported: () => boolean;
    isSOPSupported: () => boolean;
    screenSaverOn: () => void;
    screenSaverOff: () => void;
    mute: () => any;
    unmute: () => any;
    volumeUp: () => any;
    volumeDown: () => any;
    launchApp: () => any;
    suspend: () => any;
    resume: () => any;
    exit: () => void;
    powerOffScreen: () => any;
  };

  type StorageObject = {
    clear: () => void;
    get: (key: string) => string;
    init: () => void;
    set: (key: string, value: string) => void;
    unset: (key: string) => void;
  };

  type StorageManager = {
    getStorage: () => StorageObject;
  };

  type Device = {
    platform: string;
    system: System;
    storageManager: StorageManager;
  };

  type ExtensionManager = {
    getExtension: (id: string) => any;
  };

  type XDK = {
    load: (useCachedPromise?: boolean) => Promise<void>;
    platform: string;
    extensionManager: ExtensionManager;
    storageManager: unknown;
    system: unknown;
    config: unknown;
    media: any;
    storage: unknown;
    version: string;
    CONSTANT: unknown;
    environment: Environment;
    mediaManager: unknown;
    error: unknown;
  };

  export const klass: any;
  export const error: any;
  export const util: any;
  export const IDRMAgent: any;
  export const PlayerConstants: any;
  export const PlaybackErrorConstants: any;
  export const MediaConstants: any;
  export const MediaExtensionConstants: any;
  export const MediaExtensionManager: any;
  export const EventDispatcher: any;
  export const Environment: any;
  export const IPlayer: any;
  export const core: any;
  export const constantsUtil: any;
  export const environment: Environment;
  export const device: Device;
  const xdk: XDK;

  export default xdk;
}
