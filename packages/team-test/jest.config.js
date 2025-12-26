export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  collectCoverageFrom: [
    '../team-storage/src/**/*.ts',
    '../team-service/src/**/*.ts',
    '../team-ai-agent/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ]
};
