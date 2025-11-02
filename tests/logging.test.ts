import test from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";

import {
  createLoggerFactory,
  parseLogLevel,
  parsePrettyFlag,
  AppLogger,
} from "../src/logging/index.js";

class DevNull extends Writable {
  _write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    callback();
  }
}

test("parseLogLevel normalizes valid levels", () => {
  assert.equal(parseLogLevel("DEBUG"), "debug");
  assert.equal(parseLogLevel("trace"), "trace");
});

test("parseLogLevel falls back to default for invalid values", () => {
  assert.equal(parseLogLevel("invalid"), "info");
  assert.equal(parseLogLevel(undefined), "info");
});

test("parsePrettyFlag handles truthy and falsy values", () => {
  assert.equal(parsePrettyFlag("true"), true);
  assert.equal(parsePrettyFlag("1"), true);
  assert.equal(parsePrettyFlag("no"), false);
  assert.equal(parsePrettyFlag(undefined), false);
});

test("createLoggerFactory derives configuration from env", () => {
  const env = {
    LOG_LEVEL: "warn",
    LOG_PRETTY: "true",
  } as NodeJS.ProcessEnv;

  const factory = createLoggerFactory({ env });
  assert.equal(factory.level, "warn");
  assert.equal(factory.pretty, true);
});

test("child loggers namespace scope and merge bindings", () => {
  const destination = new DevNull();
  const factory = createLoggerFactory({ name: "root", destination });
  const child: AppLogger = factory.createChild({
    name: "feature",
    bindings: { sessionId: "abc-123" },
  });

  assert.equal(factory.root.bindings().scope, "root");
  assert.equal(child.bindings().scope, "root:feature");
  assert.equal(child.bindings().sessionId, "abc-123");
});

test("pretty flag can be disabled via options", () => {
  const destination = new DevNull();
  const factory = createLoggerFactory({
    env: { LOG_PRETTY: "true" } as NodeJS.ProcessEnv,
    pretty: false,
    destination,
  });

  assert.equal(factory.pretty, false);
});
