declare module '@accedo/vdkweb-winston-accedo-one' {
  type LogOptions = {
    message: string;
    errorCode: number;
    facilityCode: number;
    dim1: number;
    dim2: number;
    dim3: number;
    dim4: number;
  };

  const AccedoOne: {
    initLogLevel: () => void;
    getLogEventOptions: (
      msg: string,
      logConfig?: Omit<LogOptions, 'message'>,
    ) => LogOptions;
    log: (
      level: string,
      msg: string,
      meta?: LogOptions,
      callback?: (arg1: any, arg2: boolean) => void,
    ) => Promise<unknown>;
    getLogLevel: () => Promise<string>;
  };

  export default AccedoOne;
}
