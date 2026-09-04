
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class StorageService {
  private s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
      forcePathStyle: true,
    });
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
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: process.env.R2_BUCKET_NAME as string,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      },
    });

    await upload.done();
    return `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME as string,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
