/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.rules.test.ts'],
  // These hit a real (local) emulator over the network - the default 5s Jest timeout is too
  // tight once more than a couple of assertions run in one test.
  testTimeout: 20000,
};
