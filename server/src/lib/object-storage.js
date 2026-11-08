import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = process.env.PRIVATE_ASSETS_BUCKET;
const endpoint = process.env.S3_ENDPOINT;
const region = process.env.S3_REGION || 'auto';
const client = endpoint && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
  ? new S3Client({
      region,
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY }
    })
  : null;

export function storageConfigured() { return Boolean(client && bucket); }

export async function createUploadUrl({ key, contentType, sizeBytes }) {
  if (!storageConfigured()) {
    const error = new Error('Private object storage is not configured.');
    error.status = 503;
    throw error;
  }
  const command = new PutObjectCommand({
    Bucket: bucket, Key: key, ContentType: contentType,
    ContentLength: sizeBytes,
    ...(process.env.S3_SERVER_SIDE_ENCRYPTION ? { ServerSideEncryption: process.env.S3_SERVER_SIDE_ENCRYPTION } : {})
  });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

export async function inspectUploadedObject(key) {
  if (!storageConfigured()) {
    const error = new Error('Private object storage is not configured.');
    error.status = 503;
    throw error;
  }
  const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await object.Body.transformToByteArray();
  const detected = await fileTypeFromBuffer(bytes);
  return { sizeBytes: Number(result.ContentLength || 0), contentType: result.ContentType || '', detectedContentType: detected?.mime || '' };
}

export async function createDownloadUrl(key) {
  if (!storageConfigured()) {
    const error = new Error('Private object storage is not configured.');
    error.status = 503;
    throw error;
  }
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 120 });
}
