declare module '@accedo/vdkweb-winston' {
  type Options = {
    level?: string;
    facilityCode?: number;
    errorCode?: string;
    client?: any;
  };

  type Logger = {
    new (): Logger;
    transports: string[];
    add: (category: any, options?: Options) => void;
    debug: (message: string) => void;
    warn: (message: string) => void;
    log: (message: string) => void;
    info: (...messages: any[]) => void;
    error: (message: string, options?: any) => void;
  };

  const winston: {
    Logger: Logger;
    transports: string[];
  };

  export default winston;
}
