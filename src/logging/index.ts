import pino, {
  Bindings,
  DestinationStream,
  LevelWithSilent,
  Logger as PinoLogger,
  LoggerOptions,
  TransportSingleOptions,
} from "pino";

const TRUE_VALUES = new Set(["1", "true", "t", "yes", "y", "on"]);
const FALSE_VALUES = new Set(["0", "false", "f", "no", "n", "off"]);

const DEFAULT_LOG_LEVEL: LevelWithSilent = "info";

export type AppLogger = PinoLogger & {
  createChild(options: ChildLoggerOptions): AppLogger;
};

export interface LoggerFactoryOptions {
  /**
   * Explicit name for the root logger. Used to namespace child loggers.
   */
  name?: string;
  /**
   * Override the resolved level. Falls back to LOG_LEVEL environment value.
   */
  level?: LevelWithSilent;
  /**
   * Override pretty transport flag. Falls back to LOG_PRETTY environment value.
   */
  pretty?: boolean;
  /**
   * Additional bindings attached to every log line.
   */
  baseBindings?: Bindings;
  /**
   * Process environment to read LOG_LEVEL/LOG_PRETTY from. Defaults to process.env.
   */
  env?: NodeJS.ProcessEnv;
  /**
   * Optional destination stream to pipe log output to. Mainly useful for tests.
   */
  destination?: DestinationStream;
}

export interface ChildLoggerOptions {
  /** A descriptive scope name for the child logger. */
  name: string;
  /** Additional bindings merged with the scope. */
  bindings?: Bindings;
}

export interface LoggerFactory {
  /** The configured root logger instance. */
  root: AppLogger;
  /** Resolved log level after parsing input values. */
  level: LevelWithSilent;
  /** Indicates whether pretty transport has been enabled. */
  pretty: boolean;
  /** Convenience helper that proxies to root.createChild. */
  createChild(options: ChildLoggerOptions): AppLogger;
}

export function parseLogLevel(value?: string | null): LevelWithSilent {
  if (!value) {
    return DEFAULT_LOG_LEVEL;
  }

  const normalized = value.trim().toLowerCase();
  const validLevels: LevelWithSilent[] = [
    "fatal",
    "error",
    "warn",
    "info",
    "debug",
    "trace",
    "silent",
  ];

  if ((validLevels as string[]).includes(normalized)) {
    return normalized as LevelWithSilent;
  }

  return DEFAULT_LOG_LEVEL;
}

export function parsePrettyFlag(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  return false;
}

function wrapLogger(logger: PinoLogger, scope: string): AppLogger {
  const createChild = (options: ChildLoggerOptions): AppLogger => {
    const childScope = options.name ? `${scope}:${options.name}` : scope;
    const bindings: Bindings = {
      scope: childScope,
      ...options.bindings,
    };

    const childBase = logger.child(bindings);
    return wrapLogger(childBase, childScope);
  };

  return Object.assign(logger, { createChild }) as AppLogger;
}

export function createLoggerFactory(options: LoggerFactoryOptions = {}): LoggerFactory {
  const env = options.env ?? process.env;
  const level = options.level ?? parseLogLevel(env?.LOG_LEVEL);
  const pretty = options.pretty ?? parsePrettyFlag(env?.LOG_PRETTY);
  const scopeName = options.name ?? "lm-project-management-mcp";

  const baseBindings: Bindings = {
    scope: scopeName,
    ...options.baseBindings,
  };

  const loggerOptions: LoggerOptions = {
    level,
    base: baseBindings,
  };

  let destination: DestinationStream | undefined = options.destination;

  if (!destination && pretty) {
    const transportOptions: TransportSingleOptions = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };

    destination = pino.transport(transportOptions);
  }

  const rootLogger = destination
    ? pino(loggerOptions, destination)
    : pino(loggerOptions);

  const wrappedRoot = wrapLogger(rootLogger, baseBindings.scope ?? scopeName);

  return {
    root: wrappedRoot,
    level,
    pretty,
    createChild: (childOptions: ChildLoggerOptions) => wrappedRoot.createChild(childOptions),
  };
}

export type { LevelWithSilent } from "pino";
export type { Bindings as LoggerBindings } from "pino";
