declare module '@accedo/xdk-device-samsung-orsay-contrib' {
  import { DeviceConfig } from '@accedo/xdk-config';

  export const ID: string;

  const config: InstanceType<typeof DeviceConfig>;

  export default config;
}
