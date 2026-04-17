declare module '@accedo/xdk-device-samsung-tizen/esm/player/AVPlayer';
declare module '@accedo/xdk-device-samsung-tizen/esm/player/extension/PlayreadyDRMAgent.js';

declare module '@accedo/xdk-device-samsung-tizen' {
  import { DeviceConfig } from '@accedo/xdk-config';

  export const ID: string;

  const config: InstanceType<typeof DeviceConfig>;

  export default config;
}
