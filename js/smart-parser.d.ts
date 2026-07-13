/** Smart Kalkulator — MATM0_PARSER (js/smart-parser.js) */

export type EvaluateKind =
  | 'number'
  | 'duration'
  | 'clock'
  | 'date'
  | 'money'
  | 'physical'
  | 'percent'
  | null;

/** Wynik `_PARSER.evaluate()` — app opakowuje w `makeVal()`. */
export interface EvaluateResult {
  value?: number | null;
  unit?: string | null;
  text?: string | null;
  error?: string | null;
  kind?: EvaluateKind;
  exact?: boolean;
  exactText?: string | null;
  preciseValue?: number | null;
  pendingFx?: boolean;
  big?: boolean;
  bigStr?: string | null;
  _stateClear?: boolean;
  /** Tylko gdy `options.debug === true` */
  _debugCode?: string | null;
  _debugDetail?: string | null;
}

export interface ParserEvaluateOptions {
  firstUnitWins?: boolean;
  keepWorkCurrency?: boolean;
  fxRates?: Record<string, number>;
  fxReady?: boolean;
  defaultCurrency?: string;
  currencyCompactSymbols?: boolean;
  constants?: Array<{ name?: string; value?: unknown; kind?: string; unit?: string; dimensionless?: boolean }>;
  lastAnswer?: number | null;
  evalConstNumeric?: (c: { value?: unknown }) => number;
  unitDefs?: Record<string, { cat?: string; factor?: number; base?: string; custom?: boolean; dimensionless?: boolean }>;
  unitDisplay?: Record<string, string>;
  unitNamesRe?: string;
  defaultUnits?: Record<string, string>;
  debug?: boolean;
}

export interface CurrencyResolveResult {
  expr: string;
  unit: string | null;
  hasCurrency: boolean;
  pending: boolean;
  valueInBase?: number;
  curMul?: number;
  workCode?: string;
}

export interface Matm0Parser {
  evaluate(raw: string, options?: ParserEvaluateOptions): EvaluateResult;
  buildUnitRegistry: (unitCategories?: Record<string, unknown>) => {
    units: Record<string, unknown>;
    display: Record<string, string>;
  };
  resolveCurrencyExpression: (raw: string, options?: ParserEvaluateOptions) => CurrencyResolveResult;
  resolveUnitsExpression: (raw: string, options?: ParserEvaluateOptions) => Record<string, unknown>;
  analyzeUnitMix: (raw: string, options?: ParserEvaluateOptions) => Record<string, unknown> | null;
  evalClockExpression: (raw: string) => EvaluateResult | null;
  evalDateExpression: (raw: string) => EvaluateResult | null;
  evalTimezoneExpression: (raw: string) => EvaluateResult | null;
  evalPercentQuery: (raw: string) => EvaluateResult | null;
  evalPercentOfPercent: (raw: string) => EvaluateResult | null;
  evalPercentDifference: (raw: string) => EvaluateResult | null;
  evalPercentBaseQuery: (raw: string, options?: ParserEvaluateOptions) => EvaluateResult | null;
  evalPeriodPercentage: (raw: string) => EvaluateResult | null;
  evalAverage: (raw: string) => EvaluateResult | null;
  evalRouteCost: (raw: string) => EvaluateResult | null;
  resolveCalcAnswer: (raw: string, lastAnswer?: number | null) => string;
  resolveCalcConstants: (raw: string, options?: ParserEvaluateOptions) => string;
  resolveFunctionConstants: (raw: string, options?: ParserEvaluateOptions) => string;
  expandNumericShorthands: (raw: string) => string;
  expandCurrencyShorthands: (raw: string, options?: { fxRates?: Record<string, number> }) => string;
  parseNaturalShortcuts: (raw: string) => string;
  resolveTrigDegrees: (raw: string) => string;
  preprocessShorthands: (raw: string, options?: { fxRates?: Record<string, number> }) => string;
  preprocessNatural: (raw: string) => string;
  formatDurationSeconds: (sec: number) => string;
  hasCurrencyInInput: (raw: string, options?: { fxRates?: Record<string, number> }) => boolean;
  currencyTokenMap: (fxRates?: Record<string, number>) => Record<string, string>;
  currencyTokenRe: (map?: Record<string, string>) => string;
  currencyDisplay: (code: string, options?: { currencyCompactSymbols?: boolean }) => string;
  isDateUnit: (w: string) => boolean;
  setTodayForTests: (d: Date | null) => void;
  clearTodayForTests: () => void;
  setNowForTests: (d: Date | null) => void;
  clearNowForTests: () => void;
}

declare global {
  interface Window {
    MATM0_PARSER: Matm0Parser;
  }
}

export {};
