# core/logger

Structured logging system.

## Usage
```ts
import { createLogger } from '@alaruel/core-logger'
const log = createLogger('my-module')
log.info('Something happened', { id })
```

## Outputs
- **Development**: formatted console output
- **Production**: rotating JSON files in `data/logs/`

## Rules
- Never use `console.log` outside this package in production paths
- Every log entry carries a `source` tag (the module/system name)
