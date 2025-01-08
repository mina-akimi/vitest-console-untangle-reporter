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

import { setup } from '@mina-akimi/vitest-console-untable-reporter/setup';

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
    reporters: ['@mina-akimi/vitest-console-untable-reporter/reporter'],
    // Or if you set up a different output directory, you must also set it correctly here, otherwise the reporter cannot find the log files.
    // reporters: [['@mina-akimi/vitest-console-untable-reporter', {outputDir: 'path/to/output/dir'}]],
  },
});
```

# License

MIT
