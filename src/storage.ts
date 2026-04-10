import _isObject from 'lodash/isObject';

const IS_GEM = process.env.APP_NAME === 'gem';

const DEBUGGER_APP_START_DEV_OPTION = `${
  IS_GEM ? 'cbc' : 'ttv'
}_debuggerAppStartDevOption`;

const storage = {
  set: (key: string, value: unknown) => {
    try {
      const stringifiedValue = _isObject(value)
        ? JSON.stringify(value)
        : `${value}`;

      window.localStorage.setItem(key, stringifiedValue);
    } catch (error) {
      console.error(error);
    }
  },
  get: <T = string>(key: string): T => {
    try {
      const raw = window.localStorage.getItem(key);

      return JSON.parse(raw ?? '');
    } catch {
      return window.localStorage.getItem(key) as T;
    }
  },
  remove: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(error);
    }
  },
};

export type OnScreenDebuggerMode =
  | 'off'
  | 'active-on-demand'
  | 'active-on-start';

export const debuggerAppStartDevOption = {
  get(): OnScreenDebuggerMode {
    return (
      storage.get<OnScreenDebuggerMode>(DEBUGGER_APP_START_DEV_OPTION) ?? 'off'
    );
  },
  remove() {
    storage.remove(DEBUGGER_APP_START_DEV_OPTION);
  },
  set(value: OnScreenDebuggerMode) {
    storage.set(DEBUGGER_APP_START_DEV_OPTION, value);
  },
};
