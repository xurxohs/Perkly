# Load checks

Run only against local or staging environments:

```bash
BASE_URL=https://staging-api.perkly.uz k6 run load/catalog.js
```

The default scenario ramps to 100 concurrent readers and fails when the error rate reaches 1%, p95 exceeds 500 ms, or p99 exceeds one second. Do not point it at production without an approved maintenance window.
