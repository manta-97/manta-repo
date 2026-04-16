/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'core',
      testMatch: ['<rootDir>/packages/core/src/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'packages/core/tsconfig.test.json' }],
      },
    },
    {
      displayName: 'cli',
      testMatch: ['<rootDir>/packages/cli/src/**/*.test.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'packages/cli/tsconfig.test.json' }],
      },
    },
  ],
};
