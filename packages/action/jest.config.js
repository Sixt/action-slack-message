module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@sixt/slack-message$': '<rootDir>/../core/src/index.ts',
  },
  verbose: true,
  coverageDirectory: './coverage/',
  collectCoverage: true,
  preset: 'ts-jest',
  globalSetup: './__tests__/setupTest.ts',
};
