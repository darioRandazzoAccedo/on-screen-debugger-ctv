declare module '@accedo/xdk-device-playstation-msdk/cjs/id' {
  const id: string;

  export default id;
}

declare module '@accedo/xdk-device-playstation-msdk' {
  import { DeviceConfig } from '@accedo/xdk-config';

  export const ID: string;

  const config: InstanceType<typeof DeviceConfig>;

  export default config;
}
