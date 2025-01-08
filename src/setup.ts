import { expect, beforeEach, afterEach } from 'vitest';
import { WriteStream } from 'node:fs';
import fs from 'fs';
import { Console } from 'console';
import { createLogFile, fileHash, testNameToFileName } from './common.js';

export type SetupConfig = {
  // Directory to write the captured console log files.  Defaults to 'tmp/' in the current working directory.
  outputDir?: string;
}

export interface Context {
  outputStream?: WriteStream;
}

/**
 * Captures console output to a file in the outputDir.
 *
 * Only use this if you have a good reason to capture console output to a file yourself.
 *
 * @param outputDir
 */
export const captureConsole = (outputDir: string): WriteStream | undefined => {
  const testFile = expect.getState().testPath;
  const testName = expect.getState().currentTestName;
  if (testName == null || testFile == null) {
    return;
  }

  const fullTestName = testFile + ' > ' + testName;

  const output = fs.createWriteStream(createLogFile(fullTestName, outputDir));

  console = new Console({
    stdout: output,
    stderr: output,
  });

  return output;
};

function getOutputDir(config?: SetupConfig): string {
  return config?.outputDir ?? 'tmp/';
}

/**
 * To be used in a beforeEach hook to capture console output to a file.
 *
 * It's better to use setup() function to set up this listener globally.
 *
 * @param ctx
 * @param config
 */
export function beforeEachListener(ctx: Context, config?: SetupConfig): void {
  ctx.outputStream = captureConsole(getOutputDir(config));
}

/**
 * To be used in an afterEach hook to close the output stream.
 *
 * It's better to use setup() function to set up this listener globally.
 *
 * @param ctx
 */
export function afterEachListener(ctx: Context): void {
  if (ctx.outputStream != null) {
    ctx.outputStream.end();
  }
}

/**
 * Setup function to be called in your own vitest.setup.ts
 *
 * @param config
 */
export function setup (config?: SetupConfig): void {
  beforeEach((ctx: Context)=> {
    beforeEachListener(ctx, config);
  });

  afterEach((ctx: Context) => {
    afterEachListener(ctx);
  });
}
