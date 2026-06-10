# Test Audit TODO List

## High Priority
- [ ] **[E2E]** Refactor `e2e/full-flow.e2e.test.ts` to use a physical file-backed SQLite instance instead of `:memory:` to validate full request lifecycle and persistence across application restarts.
- [ ] **[INFRA]** Implement a specialized integration test that validates `getDb()`'s ability to successfully connect to and write to a file-system-backed SQLite database to resolve `better-sqlite3` native dependency friction.

## Medium Priority
- [ ] **[UNIT]** Extend `apps/api/src/__tests__/schemas.test.ts` to include exhaustive test cases for `CreateItemSchema`, specifically focusing on `date` regex non-compliance and `title` length boundaries.
- [ ] **[INTEGRATION]** Implement test cases for `GET /:date` with malformed date strings (e.g., `"invalid-date"`, `"2026/06/09"`) to ensure predictable error handling.
- [ ] **[INTEGRATION]** Add test coverage for `POST /items` addressing malformed JSON payloads and incomplete JSON objects to ensure 400 status code enforcement.

## Low Priority
- [ ] **[INTEGRATION]** Assertions do not validate the structure of error responses (e.g., error detail format) in 400 scenarios.
