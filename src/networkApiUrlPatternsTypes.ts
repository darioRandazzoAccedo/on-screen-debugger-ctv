const sanitizeFamilyIdSegment = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');

/** Host-provided family; optional `id` overrides auto id from `name`. */
export type NetworkApiUrlPatternsFamily = {
  name: string;
  urlPatterns: Record<string, string>;
  id?: string;
};

/** After normalization: stable `id` for nav keys and composite filter modes. */
export type NormalizedNetworkApiUrlPatternsFamily = {
  id: string;
  name: string;
  urlPatterns: Record<string, string>;
};

/** Sub-mode for URL filtering within one family: a pattern key or aggregate-all. */
export const NETWORK_API_EVERY_SUBMODE = '__every__' as const;

/** Composite `debuggerFilter` value = `${familyId}${DELIM}${patternKey | NETWORK_API_EVERY_SUBMODE}`. */
export const NETWORK_API_FILTER_DELIMITER = '\u0000';

export const buildNetworkApiFilterMode = (familyId: string, patternKeyOrEvery: string): string =>
  `${familyId}${NETWORK_API_FILTER_DELIMITER}${patternKeyOrEvery}`;

export const parseNetworkApiFilterMode = (
  mode: string
): { familyId: string; patternKeyOrEvery: string } | null => {
  const i = mode.indexOf(NETWORK_API_FILTER_DELIMITER);

  if (i <= 0 || i === mode.length - 1) {
    return null;
  }

  return {
    familyId: mode.slice(0, i),
    patternKeyOrEvery: mode.slice(i + NETWORK_API_FILTER_DELIMITER.length),
  };
};

const baseIdFromFamily = (f: NetworkApiUrlPatternsFamily): string => {
  if (f.id && f.id.trim() !== '') {
    return sanitizeFamilyIdSegment(f.id.trim());
  }

  return sanitizeFamilyIdSegment(f.name.trim()) || 'family';
};

/**
 * Assigns unique `id` per family, drops families with no URL patterns.
 */
export const normalizeNetworkApiUrlPatternFamilies = (
  families: NetworkApiUrlPatternsFamily[]
): NormalizedNetworkApiUrlPatternsFamily[] => {
  const used = new Set<string>();
  const out: NormalizedNetworkApiUrlPatternsFamily[] = [];

  families.forEach(f => {
    const keys = Object.keys(f.urlPatterns ?? {});

    if (keys.length === 0) {
      return;
    }

    let id = baseIdFromFamily(f);
    let n = 2;

    while (used.has(id)) {
      id = `${baseIdFromFamily(f)}_${n}`;
      n += 1;
    }

    used.add(id);
    out.push({
      id,
      name: f.name.trim() || id,
      urlPatterns: { ...f.urlPatterns },
    });
  });

  return out;
};
