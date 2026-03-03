import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { UploadService } from './upload.service';
import { multerConfig } from './upload.service';
import { StorageService } from '../common/services/storage.service';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly storageService: StorageService,
  ) {}

  @Get('migrate-local')
  async migrateLocal() {
    const uploadsPath = join(process.cwd(), 'uploads');
    const results = {
      success: [],
      failed: [],
      skipped: [],
    };

    if (!fs.existsSync(uploadsPath)) {
      return { message: 'Uploads directory not found', path: uploadsPath };
    }

    const getAllFiles = (dir: string, fileList: string[] = []) => {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          getAllFiles(filePath, fileList);
        } else {
          fileList.push(filePath);
        }
      });
      return fileList;
    };

    const allFiles = getAllFiles(uploadsPath);

    for (const filePath of allFiles) {
      const relativePath = filePath.replace(process.cwd(), '');
      const key = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
      
      try {
        const buffer = fs.readFileSync(filePath);
        const ext = extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.webp') contentType = 'image/webp';

        await this.storageService.uploadBuffer(buffer, key, contentType);
        results.success.push(key);
      } catch (err) {
        results.failed.push({ key, error: err.message });
      }
    }

    return {
      message: 'Migration completed',
      total: allFiles.length,
      results,
    };
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    const key = `uploads/${filename}`;

    const publicUrl = await this.storageService.uploadFile(file, key);

    return {
      success: true,
      message: 'Image uploaded successfully to R2',
      url: publicUrl,
      filename: filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
