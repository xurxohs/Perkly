# Password recovery email

Configure these environment variables in the backend deployment:

- `RESEND_API_KEY`: API key from Resend.
- `EMAIL_FROM`: verified sender, for example `Perkly <security@perkly.uz>`.
- `PASSWORD_RESET_SECRET`: long random secret used only to HMAC reset codes. Do not reuse or commit it.

Apply the `20260713153000_password_recovery` Prisma migration before deployment. Verify the sender domain in Resend, then test a valid account, an unknown email, an expired code, five invalid attempts, and successful session revocation after reset.

The API intentionally returns the same response for existing and unknown emails. Logs must never contain reset codes, email addresses, or API keys.
