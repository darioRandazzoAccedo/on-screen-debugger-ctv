declare module '@accedo/xdk-players-contrib/esm/players/shaka/extension/ShakaSubtitles.js';
declare module '@accedo/xdk-players-contrib/esm/players/shaka/extension/ShakaAudioTrack.js';
declare module '@accedo/xdk-players-contrib/esm/players/shaka/extension/CommonDRMAgent.js';
declare module '@accedo/xdk-players-contrib/esm/players/shaka' {
  const config: any;
  export const ID: string;
  export default config;
}

declare module '@accedo/xdk-players-contrib/esm/players/hlsjs' {
  const config: any;
  export const ID: string;
  export default config;
}

declare module '@accedo/xdk-players-contrib' {
  const defaultExport: any;
  export default defaultExport;
  export const shaka: any;
  export const hlsjs: any;
}
