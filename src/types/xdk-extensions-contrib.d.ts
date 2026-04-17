declare module '@accedo/xdk-extensions-contrib' {
  import { DeviceConfig } from '@accedo/xdk-config';

  export const tts: any;

  const config: InstanceType<typeof DeviceConfig>;

  export default config;
}

declare module '@accedo/xdk-extensions-contrib/esm/tts/id' {
  export const ID: string;

  export default ID;
}
