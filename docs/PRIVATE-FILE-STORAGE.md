# Private file storage

Uploads use S3-compatible private object storage (AWS S3 or Cloudflare R2). Objects are never made public; API users receive a short-lived presigned PUT URL and an owner-scoped, short-lived download URL.

## Server secrets

- PRIVATE_ASSETS_BUCKET
- S3_ENDPOINT (for R2, use the account's S3 API endpoint; for AWS S3 it may be omitted)
- S3_REGION
- S3_ACCESS_KEY_ID
- S3_SECRET_ACCESS_KEY
- S3_FORCE_PATH_STYLE=true only when required by the provider
- S3_SERVER_SIDE_ENCRYPTION=AES256 only when supported and desired by the selected provider (omit for R2 if unsupported)

Create a private bucket with public access blocked, TLS enforced, and server-side encryption enabled. Configure bucket CORS to allow PUT from the exact frontend origin and only the required Content-Type header. Restrict the service credentials to this bucket only. Configure lifecycle cleanup for abandoned pending uploads. Never commit credentials.

## Flow

1. Authenticated seller/pharmacist requests POST /api/uploads/presign with purpose, fileName, contentType, and sizeBytes.
2. Client uploads raw bytes with HTTP PUT and the exact signed Content-Type header.
3. Client calls POST /api/uploads/:id/complete.
4. The server verifies object size and declared content type with HEAD, then reads the private object and detects its file signature before marking it uploaded. A mismatch is rejected.
5. Authorized owner requests GET /api/uploads/:id/download for a 120-second private URL.

Product images allow JPEG/PNG/WebP up to 5 MiB. Credential documents allow PDF/JPEG/PNG up to 10 MiB. The API stores only metadata and generated object keys, not public URLs.

This API provides secure storage primitives. Product listing and credential review workflows must explicitly attach the returned asset ID to their business records before the file is considered reviewed or published. Provider credentials and private-bucket policy still require deployment configuration and verification.
