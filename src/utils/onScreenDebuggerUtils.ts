// Pure utility functions for the on-screen debugger.
// Copied from the host app's src/utils/onScreenDebuggerUtils.ts — no framework dependencies.

const isPlainObject = (value: unknown) =>
  Object.prototype.toString.call(value) === '[object Object]';

export interface CallSiteInfo {
  file: string | null;
  line: number | null;
  column: number | null;
  functionName: string | null;
  rawStack: string;
}

/**
 * Captures the call site information by parsing an Error stack trace.
 */
export const getCallSiteInfo = (framesToSkip = 3): CallSiteInfo => {
  const error = new Error('Placeholder CallSiteInfo error');
  const stack = error.stack || '';
  const lines = stack.split('\n');
  const callerLine = lines[framesToSkip] || '';

  const chromeMatch = /at\s+(?:([^(]+?)\s+\()?(.+):(\d+):(\d+)\)?/.exec(
    callerLine,
  );
  const firefoxMatch = /^([^@]*)@(.+):(\d+):(\d+)$/.exec(callerLine);

  if (chromeMatch) {
    return {
      functionName: chromeMatch[1] || null,
      file: chromeMatch[2],
      line: Number.parseInt(chromeMatch[3], 10),
      column: Number.parseInt(chromeMatch[4], 10),
      rawStack: stack,
    };
  }

  if (firefoxMatch) {
    return {
      functionName: firefoxMatch[1] || null,
      file: firefoxMatch[2],
      line: Number.parseInt(firefoxMatch[3], 10),
      column: Number.parseInt(firefoxMatch[4], 10),
      rawStack: stack,
    };
  }

  return {
    functionName: null,
    file: null,
    line: null,
    column: null,
    rawStack: stack,
  };
};

const isSerializable = (
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): boolean => {
  if (value === null) return true;

  const valueType = typeof value;

  if (
    valueType === 'string' ||
    valueType === 'number' ||
    valueType === 'boolean'
  )
    return true;

  if (
    valueType === 'undefined' ||
    valueType === 'function' ||
    valueType === 'symbol' ||
    valueType === 'bigint'
  ) {
    return false;
  }

  if (value instanceof Date || value instanceof Error) return true;

  if (Array.isArray(value)) {
    const arr = value as unknown[];

    if (seen.has(arr)) return false;

    seen.add(arr);

    return arr.every(item => isSerializable(item, seen));
  }

  if (isPlainObject(value)) {
    const obj = value as Record<string, unknown>;

    if (seen.has(obj)) return false;

    seen.add(obj);

    return Object.values(obj).every(item => isSerializable(item, seen));
  }

  return false;
};

const stringifyParam = (value: unknown): string => {
  if (typeof value === 'string') return value;

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value instanceof Error) return `${value.name}: ${value.message}`;

  if (value instanceof Date) return value.toISOString();

  try {
    const seen = new WeakSet<object>();

    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') return val.toString();
      if (typeof val === 'function')
        return `[Function${val.name ? `: ${val.name}` : ''}]`;
      if (typeof val === 'symbol') return val.toString();
      if (typeof val === 'undefined') return '[undefined]';

      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[Circular]';

        seen.add(val);
      }

      return val;
    });
  } catch {
    return String(value);
  }
};

export const NON_SERIALIZABLE_VALUE = '[non-serializable]';

export const normalizeParams = (params: unknown[]): string[] =>
  params.map(param =>
    isSerializable(param) ? stringifyParam(param) : NON_SERIALIZABLE_VALUE,
  );

export type ExtractedSegment =
  | { type: 'text'; value: string }
  | { type: 'json'; value: string; parsed: unknown };

export interface ExtractJsonOptions {
  prettyPrint?: boolean;
  indentSpaces?: number;
}

interface ParserState {
  depth: number;
  inString: boolean;
  escapeNext: boolean;
  foundAt: number;
}

const processChar = (
  char: string,
  state: ParserState,
  index: number,
  closingChar: '}' | ']',
): ParserState => {
  if (state.foundAt !== -1) return state;
  if (state.escapeNext) return { ...state, escapeNext: false };
  if (char === '\\' && state.inString) return { ...state, escapeNext: true };
  if (char === '"') return { ...state, inString: !state.inString };
  if (state.inString) return state;
  if (char === '{' || char === '[') return { ...state, depth: state.depth + 1 };

  if (char === '}' || char === ']') {
    const newDepth = state.depth - 1;

    if (newDepth === 0 && char === closingChar)
      return { ...state, depth: newDepth, foundAt: index };

    return { ...state, depth: newDepth };
  }

  return state;
};

const findMatchingClose = (
  input: string,
  start: number,
  closingChar: '}' | ']',
): number => {
  const initialState: ParserState = {
    depth: 0,
    inString: false,
    escapeNext: false,
    foundAt: -1,
  };
  const chars = input.slice(start).split('');
  const finalState = chars.reduce<ParserState>(
    (state, char, idx) => processChar(char, state, start + idx, closingChar),
    initialState,
  );

  return finalState.foundAt;
};

const mergeTextSegments = (segments: ExtractedSegment[]): ExtractedSegment[] =>
  segments
    .reduce<ExtractedSegment[]>((merged, segment) => {
      const last = merged[merged.length - 1];

      if (segment.type === 'text' && last?.type === 'text') {
        return [
          ...merged.slice(0, -1),
          { type: 'text', value: last.value + segment.value },
        ];
      }

      return [...merged, segment];
    }, [])
    .filter(s => s.type !== 'text' || s.value.length > 0);

interface ExtractionState {
  segments: ExtractedSegment[];
  currentIndex: number;
  done: boolean;
}

const processExtractionStep = (
  input: string,
  state: ExtractionState,
  prettyPrint: boolean,
  indentSpaces: number,
): ExtractionState => {
  if (state.done || state.currentIndex >= input.length)
    return { ...state, done: true };

  const nextBrace = input.indexOf('{', state.currentIndex);
  const nextBracket = input.indexOf('[', state.currentIndex);

  if (nextBrace === -1 && nextBracket === -1) {
    const remainingText = input.slice(state.currentIndex);

    return {
      segments:
        remainingText.length > 0
          ? [...state.segments, { type: 'text', value: remainingText }]
          : state.segments,
      currentIndex: input.length,
      done: true,
    };
  }

  const getJsonStart = (): number => {
    if (nextBrace === -1) return nextBracket;
    if (nextBracket === -1) return nextBrace;

    return Math.min(nextBrace, nextBracket);
  };

  const jsonStart = getJsonStart();
  const closingChar: '}' | ']' =
    nextBrace !== -1 && (nextBracket === -1 || nextBrace < nextBracket)
      ? '}'
      : ']';
  const textBefore =
    jsonStart > state.currentIndex
      ? [
          {
            type: 'text' as const,
            value: input.slice(state.currentIndex, jsonStart),
          },
        ]
      : [];
  const jsonEnd = findMatchingClose(input, jsonStart, closingChar);

  if (jsonEnd === -1) {
    return {
      segments: [
        ...state.segments,
        ...textBefore,
        { type: 'text', value: input.slice(jsonStart) },
      ],
      currentIndex: input.length,
      done: true,
    };
  }

  const jsonString = input.slice(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonString);
    const formattedValue = prettyPrint
      ? JSON.stringify(parsed, null, indentSpaces)
      : jsonString;

    return {
      segments: [
        ...state.segments,
        ...textBefore,
        { type: 'json', value: formattedValue, parsed },
      ],
      currentIndex: jsonEnd + 1,
      done: false,
    };
  } catch {
    return {
      segments: [
        ...state.segments,
        ...textBefore,
        { type: 'text', value: input[jsonStart] },
      ],
      currentIndex: jsonStart + 1,
      done: false,
    };
  }
};

const extractRecursive = (
  input: string,
  state: ExtractionState,
  prettyPrint: boolean,
  indentSpaces: number,
): ExtractedSegment[] => {
  const nextState = processExtractionStep(
    input,
    state,
    prettyPrint,
    indentSpaces,
  );

  if (nextState.done) return mergeTextSegments(nextState.segments);

  return extractRecursive(input, nextState, prettyPrint, indentSpaces);
};

export const extractJsonFromString = (
  input: string,
  options: ExtractJsonOptions = {},
): ExtractedSegment[] => {
  const { prettyPrint = false, indentSpaces = 2 } = options;
  const initialState: ExtractionState = {
    segments: [],
    currentIndex: 0,
    done: false,
  };

  return extractRecursive(input, initialState, prettyPrint, indentSpaces);
};

export const formatStringWithJson = (
  input: string,
  indentSpaces = 2,
): string => {
  const segments = extractJsonFromString(input, {
    prettyPrint: true,
    indentSpaces,
  });

  return segments.map(segment => segment.value).join('');
};

export const parseResponseBody = async (
  response: Response,
): Promise<unknown> => {
  try {
    const contentType = response.headers.get('content-type') || '';
    const cloned = response.clone();

    if (contentType.includes('application/json')) return await cloned.json();

    if (
      contentType.includes('text/') ||
      contentType.includes('application/xml')
    ) {
      return await cloned.text();
    }
  } catch {
    // Response might not be readable
  }

  return null;
};
