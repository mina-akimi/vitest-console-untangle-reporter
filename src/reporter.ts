import { DefaultReporter } from 'vitest/reporters';
import { File, Task } from '@vitest/runner';
import { getSuites, getTests, getFullName } from '@vitest/runner/utils';
import fs from 'fs';
import c from 'tinyrainbow';
import { stripVTControlCharacters } from 'node:util';
import { createLogFile } from './common.js';

const F_LONG_DASH = '⎯';

// Adapted from https://github.com/vitest-dev/vitest/blob/3341fb58d0100821204798886f5303d1ee97550b/packages/vitest/src/node/reporters/renderers/utils.ts#L124C17-L126C2
const countTestErrors = (tasks: Task[]): number => {
  return tasks.reduce((c, i) => c + (i.result?.errors?.length || 0), 0);
};

// Adapted from https://github.com/vitest-dev/vitest/blob/3341fb58d0100821204798886f5303d1ee97550b/packages/vitest/src/node/reporters/renderers/utils.ts#L215C17-L229C2
const formatProjectName = (name: string | undefined, suffix = ' '): string => {
  if (!name) {
    return '';
  }
  if (!c.isColorSupported) {
    return `|${name}|${suffix}`;
  }
  const index = name.split('').reduce((acc, v, idx) => acc + v.charCodeAt(0) + idx, 0);

  const colors = [c.black, c.yellow, c.cyan, c.green, c.magenta];

  return c.inverse(colors[index % colors.length](` ${name} `)) + suffix;
};

// Adapted from https://github.com/vitest-dev/vitest/blob/main/packages/vitest/src/node/reporters/renderers/utils.ts
const getCols = (delta = 0): number => {
  let length = process.stdout?.columns;
  if (!length || Number.isNaN(length)) {
    length = 30;
  }
  // Set to 80 so it prints nicely in Concourse, as Concourse's process.stdout?.columns is too big.
  if (length > 80) {
    length = 80;
  }
  return Math.max(length + delta, 0);
};

// Adapted from https://github.com/vitest-dev/vitest/blob/main/packages/vitest/src/node/reporters/renderers/utils.ts
const divider = (text?: string, left?: number, right?: number): string => {
  const cols = getCols();

  if (text) {
    const textLength = stripVTControlCharacters(text).length;
    if (left == null && right != null) {
      left = cols - textLength - right;
    } else {
      left = left ?? Math.floor((cols - textLength) / 2);
      right = cols - textLength - left;
    }
    left = Math.max(0, left);
    right = Math.max(0, right);
    return `${F_LONG_DASH.repeat(left)}${text}${F_LONG_DASH.repeat(right)}`;
  }
  return F_LONG_DASH.repeat(cols);
};

function errorBanner(message: string) {
  return c.red(divider(c.bold(c.inverse(` ${message} `))));
}

const getNamesWithAbsPath = (task: Task): string[] => {
  const names = [task.name];
  let current: Task | undefined = task;

  while (current?.suite) {
    current = current.suite;
    if (current?.name) {
      names.unshift(current.name);
    }
  }

  if (current !== task.file) {
    names.unshift(task.file.filepath);
  }

  return names;
};

export interface ReporterOptions {
  outputDir?: string;


  // Copied from https://github.com/vitest-dev/vitest/blob/d69cc75698dd6dbeaed5c237ebb46ccd41bfb438/packages/vitest/src/node/reporters/base.ts#L19C1-L21C2
  isTTY?: boolean;
}

function getOutputDir(option?: ReporterOptions): string {
  return option?.outputDir ?? 'tmp/';
}

/**
 * Custom reporter that prints the console log from parallel run tests correctly after each test.
 */
export class Reporter extends DefaultReporter {
  private readonly options: ReporterOptions;

  constructor(options: ReporterOptions = {}) {
    super(options);
    this.options = options;
  }

  // Adapted from https://github.com/vitest-dev/vitest/blob/main/packages/vitest/src/node/reporters/base.ts#L413
  onFinished(files: File[], errors: unknown[], coverage?: unknown) {
    // Very important!  Otherwise the test process will not exit due to open file handles.
    super.stopListRender();
    this.end = performance.now();

    const suites = getSuites(files);
    const tests = getTests(files);

    const failedSuites = suites.filter((i) => i.result?.errors);
    const failedTests = tests.filter((i) => i.result?.state === 'fail');
    const failedTotal = countTestErrors(failedSuites) + countTestErrors(failedTests);

    let current = 1;
    const errorDivider = () => this.error(`${c.red(c.dim(divider(`[${current++}/${failedTotal}]`, undefined, 1)))}\n`);

    if (failedSuites.length) {
      this.error(`\n${errorBanner(`Failed Suites ${failedSuites.length}`)}\n`);
      this.printTaskErrorsOverride(failedSuites, errorDivider);
    }

    if (failedTests.length) {
      this.error(`${errorBanner(`Failed Tests ${failedTests.length}`)}\n`);
      this.printTaskErrorsOverride(failedTests, errorDivider);
    }

    if (errors.length) {
      this.ctx.logger.printUnhandledErrors(errors);
      this.error();
    }

    this.reportTestSummary(files, errors);
  }

  // Adapted from https://github.com/vitest-dev/vitest/blob/3341fb58d0100821204798886f5303d1ee97550b/packages/vitest/src/node/reporters/base.ts#L469
  private printTaskErrorsOverride(tasks: Task[], errorDivider: () => void) {
    const errorsQueue: [error: any | undefined, tests: Task[]][] = [];

    for (const task of tasks) {
      // Merge identical errors
      task.result?.errors?.forEach((error) => {
        let previous;

        if (error?.stackStr) {
          previous = errorsQueue.find((i) => {
            if (i[0]?.stackStr !== error.stackStr) {
              return false;
            }

            const currentProjectName = (task as File)?.projectName || task.file?.projectName || '';
            const projectName = (i[1][0] as File)?.projectName || i[1][0].file?.projectName || '';

            return projectName === currentProjectName;
          });
        }

        if (previous) {
          previous[1].push(task);
        } else {
          errorsQueue.push([error, [task]]);
        }
      });
    }

    for (const [error, tasks] of errorsQueue) {
      for (const task of tasks) {
        const filepath = (task as File)?.filepath || '';
        const projectName = (task as File)?.projectName || task.file?.projectName || '';

        let name = getFullName(task, c.dim(' > '));
        const testName = getNamesWithAbsPath(task).join(' > ');

        if (filepath) {
          name += c.dim(` [ ${this.relative(filepath)} ]`);
        }

        this.ctx.logger.error(`${c.red(c.bold(c.inverse(' FAIL ')))} ${formatProjectName(projectName)}${name}`);

        if (task.type === 'test') {
          const fileFullName = createLogFile(testName, getOutputDir(this.options));
          try {
            const data = fs.readFileSync(fileFullName, 'utf8');
            this.log('Console output: ');
            this.log(data);
          } catch (err) {
            this.ctx.logger.error(`${c.red('Error reading console log output file, must add beforeEach from this lib to vitest.setup.ts: ' + (err as Error).message)}`);
          }
        }
      }

      const screenshotPaths = tasks.map((t) => (t.meta as any)?.failScreenshotPath).filter((screenshot) => screenshot != null);

      this.ctx.logger.printError(error, {
        project: this.ctx.getProjectByName(tasks[0].file.projectName || ''),
        verbose: this.verbose,
        screenshotPaths: screenshotPaths as string[],
        task: tasks[0],
      });

      errorDivider();
    }
  }
}
