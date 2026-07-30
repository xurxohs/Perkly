# OAuth setup

## Sign in with Apple

1. Enable **Sign in with Apple** for the iOS App ID in Apple Developer.
2. Ensure the provisioning profile contains the `com.apple.developer.applesignin` entitlement.
3. Set backend `APPLE_CLIENT_ID` to the exact signed application identifier. The current Xcode target uses `com.perkly.app.dev`.
4. Apply the `20260713160000_oauth_identities` Prisma migration.
5. Test on a physical device with both a visible email and Apple's private relay option.

The iOS app generates a fresh random nonce for every request. The backend verifies its SHA-256 value together with Apple's JWT signature, issuer, audience, expiration, and stable `sub` identifier.

Before production, configure Apple's private email relay for the domain used by transactional mail. Never log identity tokens, authorization codes, Apple `sub` values, or relay addresses.
