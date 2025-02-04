# Overview

When running Vitest in parallel mode (the default mode), Vitest runs each test file in a separate thread.

A problem with this is the `console` output are interleaved and can be hard to read.

This reporter solves the problem by saving the `console` output to a file for each test case, and then printing the
output at the end if the test case fails.

# Usage

```sh
# Install the reporter
yarn add -D @mina-akimi/vitest-console-untable-reporter
```

```ts
// vitest.setup.ts, or any set up file you use

import { setup } from '@mina-akimi/vitest-console-untangle-reporter/setup';

// Run this to set up the `beforeEach` and `afterEach` hooks to intercept console output and save it to a file.
setup();

// You can also do this to override the log file output directory
// setup({ outputDir: 'path/to/output/dir' });
```

> Remember to add `vitest.setup.ts` to your `vitest.config.ts` file. Check the official doc for how to do this.

```ts
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // reporters: ['default'],
    reporters: ['@mina-akimi/vitest-console-untangle-reporter/reporter'],
    // Or if you set up a different output directory, you must also set it correctly here, otherwise the reporter cannot find the log files.
    // reporters: [['@mina-akimi/vitest-console-untangle-reporter/reporter', {outputDir: 'path/to/output/dir'}]],
  },
});
```

# Limitations

- The reporter only prints the console output for failed test cases.  This is because it's adapted from the `DefaultReporter`, which only prints errors on failed tests.
- This reporter works by replacing the global `console` with one that outputs to the log files.  As a result, this only works if the tests files are run in [isolation](https://vitest.dev/guide/improving-performance) (i.e., not sharing global `console`), and test cases inside a file are not run [concurrently](https://vitest.dev/guide/features#running-tests-concurrently).
- This only intercepts `console` logs.  Any other ways that print out to stdout/stderr are not captured.

# License

MIT
