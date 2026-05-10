# core/logger

Structured logging system.

## Usage

```ts
import { createLogger } from '@alaruel/core-logger';

const log = createLogger('my-module');
log.info('Something happened', { id });
```

## Outputs

- Default console output
- Optional extra sinks can be added with `configureLogger()`

## Rules

- Never use `console.log` outside this package in production paths
- Every log entry carries a `source` tag
