declare module '@accedo/xdk-device-playstation-webmaf' {
  import { DeviceConfig } from '@accedo/xdk-config';

  export const ID: string;

  const config: InstanceType<typeof DeviceConfig>;

  export default config;
}
