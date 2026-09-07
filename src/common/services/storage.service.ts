import { Injectable, Logger } from '@nestjs/common';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as fs from 'fs';
import { join, dirname } from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;

  constructor() {
    this.initS3Client();
  }

  private initS3Client() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET_NAME;

    if (endpoint && accessKeyId && secretAccessKey && bucket) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log('Cloudflare R2 / S3 storage client initialized successfully.');
    } else {
      this.logger.warn(
        'R2 credentials incomplete. StorageService falling back to local file system (/uploads).',
      );
    }
  }

  get isR2Configured(): boolean {
    return !!this.s3Client && !!process.env.R2_BUCKET_NAME;
  }

  get accessKeyId() {
    return process.env.R2_ACCESS_KEY_ID;
  }

  get secretAccessKey() {
    return process.env.R2_SECRET_ACCESS_KEY;
  }

  get endpoint() {
    return process.env.R2_ENDPOINT;
  }

  get bucket() {
    return process.env.R2_BUCKET_NAME;
  }

  async uploadFile(file: any, key: string): Promise<string> {
    return this.uploadBuffer(file.buffer, key, file.mimetype);
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
    if (this.isR2Configured && this.s3Client) {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: process.env.R2_BUCKET_NAME as string,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=315360000, immutable',
        },
      });

      await upload.done();
      const domain = process.env.R2_PUBLIC_DOMAIN
        ? process.env.R2_PUBLIC_DOMAIN.replace(/\/$/, '')
        : (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
      
      const cleanKey = key.startsWith('/') ? key.slice(1) : key;
      return `${domain}/${cleanKey}`;
    }

    // Fallback: save to local disk
    const targetPath = join(process.cwd(), key);
    const targetDir = dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);
    const baseUrl = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    return `${baseUrl}/${cleanKey}`;
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isR2Configured && this.s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME as string,
        Key: key,
      });

      await this.s3Client.send(command);
    } else {
      const targetPath = join(process.cwd(), key);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
    }
  }
}
