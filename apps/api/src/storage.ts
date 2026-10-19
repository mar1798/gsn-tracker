import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Env } from './env.js';

/** Raw FIT files. S3 in dev/prod, memory in tests. */
export interface FileStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class S3Storage implements FileStorage {
  private readonly client: S3Client;

  constructor(
    env: Pick<Env, 'S3_ENDPOINT' | 'S3_REGION' | 'S3_ACCESS_KEY' | 'S3_SECRET_KEY'>,
    private readonly bucket: string,
  ) {
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
      // SeaweedFS/MinIO serve buckets by path, not by subdomain.
      forcePathStyle: true,
    });
  }

  async put(key: string, body: Uint8Array, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export class MemoryStorage implements FileStorage {
  readonly objects = new Map<string, Uint8Array>();

  async put(key: string, body: Uint8Array) {
    this.objects.set(key, body);
  }

  async delete(key: string) {
    this.objects.delete(key);
  }
}
