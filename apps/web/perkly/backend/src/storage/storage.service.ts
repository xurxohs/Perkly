import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

@Injectable()
export class StorageService {
  private readonly driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
  private readonly bucket = process.env.S3_BUCKET?.trim();
  private readonly publicS3BaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim()?.replace(/\/+$/, '');
  private readonly s3 = this.driver === 's3'
    ? new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
        credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
      })
    : null;

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    const normalizedKey = key.replace(/^\/+/, '').replace(/\.\.(\/|\\)/g, '');
    if (this.driver === 's3') {
      if (!this.s3 || !this.bucket || !this.publicS3BaseUrl) {
        throw new ServiceUnavailableException('S3 storage is not fully configured');
      }
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: normalizedKey,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return `${this.publicS3BaseUrl}/${normalizedKey}`;
    }

    const target = join(process.cwd(), 'uploads', normalizedKey);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    return `${this.publicApiUrl()}/uploads/${normalizedKey}`;
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = key.replace(/^\/+/, '').replace(/\.\.(\/|\\)/g, '');
    if (this.driver === 's3') {
      if (!this.s3 || !this.bucket) throw new ServiceUnavailableException('S3 storage is not fully configured');
      await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: normalizedKey }));
      return;
    }
    await unlink(join(process.cwd(), 'uploads', normalizedKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  private publicApiUrl() {
    return (process.env.PUBLIC_API_URL || process.env.FRONTEND_URL || 'https://perkly.uz')
      .trim()
      .replace(/\/+$/, '');
  }
}
