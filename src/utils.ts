import React, { Children, Fragment } from 'react';

// ----- merged from src/utils/lazyUtils.ts -----
export type ItemMetadata = {
  index: number;
  prev: string;
  next: string;
  itemStart: number;
  size: number;
  isVisible: boolean;
  shouldRender: boolean;
};

type GetLimitedValueArgs = {
  min?: number;
  max?: number;
  n?: number;
};

type GetMetadataArgs<ItemType, Extra> = {
  items: ItemType[];
  axis: number;
  containerSize: number;
  offset?: number;
  getItemId: (item: ItemType, index: number) => string;
  getItemSize: (item: ItemType, index: number) => number;
  getItemMeta?: (item: ItemType) => any;
  setSubsetItem?: (
    item: ItemType,
    id: string,
    index: number,
  ) => ItemType & Extra;
};

type GetMetadataReturn<Extra> = {
  itemsMetadata: Record<string, ItemMetadata & Extra>;
  totalSize: number;
  compensation: number;
  compensationArray: number[];
  subset: any[];
};

export function getLimitedValue({
  min = -Infinity,
  max = Infinity,
  n = 0,
}: GetLimitedValueArgs) {
  return Math.min(Math.max(n, min), max);
}

export function getMaxScroll(
  stackedHeight: number,
  extraPush: number,
  containerSize: number,
) {
  return -Math.abs(stackedHeight - containerSize + extraPush);
}

function isWithinRange(min: number, max: number, x: number) {
  return x >= min && x <= max;
}

function isItemVisible({
  visibleStart,
  visibleEnd,
  itemStart,
  itemEnd,
}: {
  visibleStart: number;
  visibleEnd: number;
  itemStart: number;
  itemEnd: number;
}) {
  return (
    isWithinRange(visibleStart, visibleEnd, itemStart) ||
    isWithinRange(visibleStart, visibleEnd, itemEnd)
  );
}

function getMetadata<Extra = {}, ItemType = any>({
  items,
  axis,
  offset = 0,
  containerSize,
  getItemId,
  getItemSize,
  setSubsetItem,
  getItemMeta,
}: GetMetadataArgs<ItemType, Extra>): GetMetadataReturn<Extra> {
  const visibleStart = Math.abs(axis) - offset;
  const visibleEnd = containerSize + visibleStart + offset;
  const itemsMetadata: Record<string, ItemMetadata & Extra> = {};
  const subset: any[] = [];
  let stackedDistance = 0;
  let compensation = 0;
  const compensationArray: number[] = [];
  let hasAnyItemRender = false;
  let prevItemId = '';
  let prevItem: any = null;

  items.forEach((item, index) => {
    const itemId = getItemId(item, index);
    const itemSize = getItemSize(item, index);
    const relativeItemDistance = stackedDistance + itemSize;
    const isVisible = isItemVisible({
      visibleStart,
      visibleEnd,
      itemStart: stackedDistance,
      itemEnd: relativeItemDistance,
    });
    const prevItemMetadata: any = itemsMetadata[prevItemId];
    const isPreviousItemVisible = !!(
      prevItemMetadata && prevItemMetadata.isVisible
    );
    const shouldRender = isVisible || isPreviousItemVisible;
    const itemMetadata = {
      index,
      prev: prevItemId ?? '',
      next: '',
      itemStart: stackedDistance,
      size: itemSize,
      isVisible,
      shouldRender,
    };

    (itemsMetadata[itemId] as ItemMetadata) = {
      ...itemMetadata,
      ...(getItemMeta ? getItemMeta(item) : {}),
    };

    stackedDistance += itemSize;

    if (prevItemMetadata) {
      prevItemMetadata.next = itemId;

      if (isVisible && !prevItemMetadata.shouldRender) {
        prevItemMetadata.shouldRender = true;

        subset.push(
          setSubsetItem
            ? setSubsetItem(prevItem, prevItemId, index - 1)
            : prevItem,
        );

        hasAnyItemRender = true;

        compensation -= prevItemMetadata.size;
        compensationArray.pop();
      }
    }

    if (shouldRender) {
      hasAnyItemRender = true;
      subset.push(setSubsetItem ? setSubsetItem(item, itemId, index) : item);
    }

    if (!hasAnyItemRender) {
      compensation += itemSize;
      compensationArray.push(itemSize);
    }

    prevItemId = itemId;
    prevItem = item;
  });

  return {
    itemsMetadata,
    totalSize: stackedDistance,
    compensation,
    compensationArray,
    subset,
  };
}

export { getMetadata };

// ----- merged from src/utils/navigationEnabler.ts -----
let enableNavigation = true;
let isNavigationBlocked = false;

function blockNavigation(isBlocked: boolean) {
  isNavigationBlocked = isBlocked;
  enableNavigation = !isBlocked;
}

function toggleNavigation(toggle: boolean) {
  if (!isNavigationBlocked) {
    enableNavigation = toggle;
  }
}

function isEnabled() {
  return enableNavigation;
}

export const navigationEnabler = {
  blockNavigation,
  toggleNavigation,
  isEnabled,
};

// ----- getResolution (OSD default 1920×1080, no #/config) -----
const DEFAULT_SCREEN_WIDTH = 1920;
const DEFAULT_SCREEN_HEIGHT = 1080;

export function getResolution() {
  return {
    width: DEFAULT_SCREEN_WIDTH,
    height: DEFAULT_SCREEN_HEIGHT,
    widthVw: DEFAULT_SCREEN_WIDTH / (DEFAULT_SCREEN_WIDTH / 100),
    heightVw: DEFAULT_SCREEN_HEIGHT / (DEFAULT_SCREEN_WIDTH / 100),
  };
}

// ----- getRelativePixel + toVw -----
const FULL_HD = 1920;

export function getRelativePixel(pixels: number): number {
  const { width } = getResolution();
  const fullHDContext = FULL_HD * 0.01;
  const currentContext = width * 0.01;
  const vw = pixels / fullHDContext;

  return Math.round(vw * currentContext);
}

const DEFAULT_CONTEXT = 1920;

export function toVw(pixels: number, viewport = DEFAULT_CONTEXT) {
  const oneVW = viewport / 100;

  return pixels / oneVW;
}

export function toPx(viewUnit: number, viewport = DEFAULT_CONTEXT) {
  return getRelativePixel(Math.round(viewUnit * (viewport / 100)));
}

// ----- merged from debugScrollUtils -----
type ReactChildArray = ReturnType<typeof Children.toArray>;
type UnknownChild = React.ReactElement<any>;

export function isFragment(child: UnknownChild) {
  return child.type === Fragment;
}

export function isContainer(child: UnknownChild) {
  return child.props['data-scroll-container'] === true;
}

export function flattenChildren(children: React.ReactNode): ReactChildArray {
  const childrenArray = Children.toArray(children);

  return childrenArray.reduce((flatChildren: ReactChildArray, child) => {
    if (!child) {
      return flatChildren;
    }

    const unknownChild = child as UnknownChild;

    if (isFragment(unknownChild) || isContainer(unknownChild)) {
      return [...flatChildren, ...flattenChildren(unknownChild.props.children)];
    }

    return [...flatChildren, child];
  }, []);
}

function getScrollChildItemId(child: any) {
  const childId = child.props.nav?.id;

  if (!childId) {
    throw new Error(
      'Scroll.tsx: Child id not found. All Scroll children must have a nav prop with an id',
    );
  }

  return childId;
}

function getScrollChildItemSize(child: any) {
  const getChildHeight = child.type.getHeight;

  if (!getChildHeight) {
    throw new Error(
      "Scroll.tsx: getHeight not found. All Scroll children's component must have a static getHeight function",
    );
  }

  return getChildHeight(child.props);
}

const scrollDataAttr = {
  SCROLL_FULL: 'data-scroll-full',
  SCROLL_AXIS: 'data-scroll-axis',
};

function getScrollChildItemMeta(item: any) {
  const { props } = item;

  if (props[scrollDataAttr.SCROLL_FULL]) {
    return {
      scrollFull: true,
    };
  }

  if (props[scrollDataAttr.SCROLL_AXIS] !== undefined) {
    return {
      scrollAxis: props[scrollDataAttr.SCROLL_AXIS],
    };
  }

  return {};
}

export function getScrollItems(children: React.ReactNode) {
  const flatArray = flattenChildren(children);

  return (flatArray as UnknownChild[]).filter(
    ({ props }) => props['data-scroll-item'],
  );
}

export function getChildrenMetadata(
  children: React.ReactNode,
  axis: number,
  containerHeight: number,
) {
  const scrollItems = getScrollItems(children);

  return getMetadata({
    items: scrollItems,
    containerSize: containerHeight,
    axis,
    getItemId: getScrollChildItemId,
    getItemSize: getScrollChildItemSize,
    getItemMeta: getScrollChildItemMeta,
  });
}

export function filterChildren(
  children: React.ReactNode,
  subset: any[] | null,
): any {
  const activeChildren: any[] = [];
  const childrenArray = Children.toArray(children);

  (childrenArray as UnknownChild[]).forEach(child => {
    if (isContainer(child)) {
      const newChild = {
        ...child,
        props: {
          ...child.props,
          children: filterChildren(child.props.children, subset),
        },
      };

      if (newChild.props.children.length) {
        activeChildren.push(newChild);
      }

      return;
    }

    const isChildInSubset = (subset ?? []).some(({ key }) => key === child.key);

    if (isChildInSubset) {
      activeChildren.push(child);
    }
  });

  return activeChildren;
}

// ----- onScreenDebuggerUtils (original body below) -----
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
 * @param framesToSkip - Number of stack frames to skip to get to the actual caller.
 *                       Default is 3 (Error, getCallSiteInfo, and the interceptor function).
 */
export const getCallSiteInfo = (framesToSkip = 3): CallSiteInfo => {
  const error = new Error('Placeholder CallSiteInfo error');
  const stack = error.stack || '';

  const lines = stack.split('\n');
  const callerLine = lines[framesToSkip] || '';

  // Chrome/V8 format: "    at functionName (file:line:col)" or "    at file:line:col"
  const chromeMatch = /at\s+(?:([^(]+?)\s+\()?(.+):(\d+):(\d+)\)?/.exec(
    callerLine,
  );

  // Firefox/Safari format: "functionName@file:line:col"
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
  if (value === null) {
    return true;
  }

  const valueType = typeof value;

  if (
    valueType === 'string' ||
    valueType === 'number' ||
    valueType === 'boolean'
  ) {
    return true;
  }

  if (
    valueType === 'undefined' ||
    valueType === 'function' ||
    valueType === 'symbol' ||
    valueType === 'bigint'
  ) {
    return false;
  }

  if (value instanceof Date || value instanceof Error) {
    return true;
  }

  if (Array.isArray(value)) {
    const arrayValue = value as unknown[];

    if (seen.has(arrayValue)) {
      return false;
    }

    seen.add(arrayValue);

    return arrayValue.every(item => isSerializable(item, seen));
  }

  if (isPlainObject(value)) {
    const objectValue = value as Record<string, unknown>;

    if (seen.has(objectValue)) {
      return false;
    }

    seen.add(objectValue);

    return Object.values(objectValue).every(item => isSerializable(item, seen));
  }

  return false;
};

const stringifyParam = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  try {
    const seen = new WeakSet<object>();

    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }

      if (typeof val === 'function') {
        return `[Function${val.name ? `: ${val.name}` : ''}]`;
      }

      if (typeof val === 'symbol') {
        return val.toString();
      }

      if (typeof val === 'undefined') {
        return '[undefined]';
      }

      if (val && typeof val === 'object') {
        if (seen.has(val)) {
          return '[Circular]';
        }

        seen.add(val);
      }

      return val;
    });
  } catch (error) {
    return String(value);
  }
};

export const NON_SERIALIZABLE_VALUE = '[non-serializable]';

export const normalizeParams = (params: unknown[]) =>
  params.map(param => {
    if (isSerializable(param)) {
      return stringifyParam(param);
    }

    return NON_SERIALIZABLE_VALUE;
  });

// ============================================================================
// JSON Extraction Utilities
// ============================================================================

export type ExtractedSegment =
  | { type: 'text'; value: string }
  | { type: 'json'; value: string; parsed: unknown };

export interface ExtractJsonOptions {
  /** Pretty-print JSON with indentation (default: false) */
  prettyPrint?: boolean;
  /** Number of spaces for indentation when pretty-printing (default: 2) */
  indentSpaces?: number;
}

interface ParserState {
  depth: number;
  inString: boolean;
  escapeNext: boolean;
  foundAt: number;
}

/**
 * Processes a single character and returns the updated parser state.
 */
const processChar = (
  char: string,
  state: ParserState,
  index: number,
  closingChar: '}' | ']',
): ParserState => {
  if (state.foundAt !== -1) {
    return state;
  }

  if (state.escapeNext) {
    return { ...state, escapeNext: false };
  }

  if (char === '\\' && state.inString) {
    return { ...state, escapeNext: true };
  }

  if (char === '"') {
    return { ...state, inString: !state.inString };
  }

  if (state.inString) {
    return state;
  }

  if (char === '{' || char === '[') {
    return { ...state, depth: state.depth + 1 };
  }

  if (char === '}' || char === ']') {
    const newDepth = state.depth - 1;

    if (newDepth === 0 && char === closingChar) {
      return { ...state, depth: newDepth, foundAt: index };
    }

    return { ...state, depth: newDepth };
  }

  return state;
};

/**
 * Finds the matching closing bracket/brace, handling nested structures and strings.
 */
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

/**
 * Merges consecutive text segments into one.
 */
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

/**
 * Processes a single extraction step.
 */
const processExtractionStep = (
  input: string,
  state: ExtractionState,
  prettyPrint: boolean,
  indentSpaces: number,
): ExtractionState => {
  if (state.done || state.currentIndex >= input.length) {
    return { ...state, done: true };
  }

  const nextBrace = input.indexOf('{', state.currentIndex);
  const nextBracket = input.indexOf('[', state.currentIndex);

  // No more JSON found
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
    if (nextBrace === -1) {
      return nextBracket;
    }

    if (nextBracket === -1) {
      return nextBrace;
    }

    return Math.min(nextBrace, nextBracket);
  };

  const jsonStart = getJsonStart();

  const closingChar: '}' | ']' =
    nextBrace !== -1 && (nextBracket === -1 || nextBrace < nextBracket)
      ? '}'
      : ']';

  // Add text before JSON if any
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

  // No valid closing found
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
    // Not valid JSON, treat opening char as text and continue
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

/**
 * Recursively extracts JSON from string.
 */
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

  if (nextState.done) {
    return mergeTextSegments(nextState.segments);
  }

  return extractRecursive(input, nextState, prettyPrint, indentSpaces);
};

/**
 * Extracts JSON objects and arrays from a string, returning segments of text and JSON.
 * Handles nested objects/arrays, strings containing braces/brackets, and multiple JSON objects.
 *
 * @param input - The string potentially containing JSON objects or arrays
 * @param options - Configuration options for extraction
 * @returns Array of segments, each being either text or parsed JSON
 */
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

/**
 * Formats a string containing JSON by pretty-printing all JSON objects/arrays found within.
 * Non-JSON text is preserved as-is.
 *
 * @param input - The string potentially containing JSON
 * @param indentSpaces - Number of spaces for indentation (default: 2)
 * @returns The formatted string with pretty-printed JSON
 */
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

// Helper to parse response body based on content type
export const parseResponseBody = async (response: Response): Promise<any> => {
  try {
    const contentType = response.headers.get('content-type') || '';
    const cloned = response.clone();

    if (contentType.includes('application/json')) {
      return await cloned.json();
    }

    if (
      contentType.includes('text/') ||
      contentType.includes('application/xml')
    ) {
      return await cloned.text();
    }
  } catch {
    // Response might not be readable, ignore
  }

  return null;
};
