# APNs configuration

Required environment variables:

- `APN_KEY`: path to an Apple `.p8` key, PEM text, or base64-encoded PEM.
- `APN_KEY_ID`: Key ID from Apple Developer.
- `APN_TEAM_ID`: Apple Developer Team ID.
- `APN_BUNDLE_ID`: exact iOS application bundle identifier. The current project uses `com.perkly.app.dev`; this value must match the signed target.
- `APN_PRODUCTION`: `true` for production APNs, `false` for sandbox. When omitted, `NODE_ENV=production` selects production.

Never commit the `.p8` file or print APNs device tokens. After changing credentials, send one purchase and one chat notification to a physical device and verify their deep links.
