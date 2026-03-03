import {
  Controller,
  Post,
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
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly storageService: StorageService,
  ) {}

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
