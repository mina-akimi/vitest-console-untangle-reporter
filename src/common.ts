import crypto from 'crypto';
import path from 'path';

export const testNameToFileName = (taskName: string) => {
  return taskName.replaceAll(' > ', '%').replaceAll(' ', '_');
};

export const fileHash = (fileName: string): string => {
  return crypto.createHash('sha1').update(fileName).digest('hex');
};

export const createLogFile = (taskName: string, outputDir: string): string => {
  return path.join(outputDir, 'vitest-untangle.' + fileHash(testNameToFileName(taskName)) + '.log');
};
