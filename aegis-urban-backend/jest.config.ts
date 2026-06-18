import type { Config } from "jest";

const config: Config = {
  preset:          "ts-jest",
  testEnvironment: "node",
  roots:           ["<rootDir>/tests"],
  testMatch:       ["**/*.test.ts", "**/*.spec.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@config/(.*)$":    "<rootDir>/src/config/$1",
    "^@modules/(.*)$":   "<rootDir>/src/modules/$1",
    "^@core/(.*)$":      "<rootDir>/src/core/$1",
    "^@shared/(.*)$":    "<rootDir>/src/shared/$1",
    "^@integrity/(.*)$": "<rootDir>/src/integrity/$1",
    "^@security/(.*)$":  "<rootDir>/src/security/$1",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory:   "coverage",
  verbose:             true,
};

export default config;
