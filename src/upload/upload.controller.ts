import {
  Controller,
  Post,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { multerConfig } from './upload.service';
import { StorageService } from '../common/services/storage.service';
import { ImageService } from '../common/services/image.service';
import { extname, join } from 'path';
import * as fs from 'fs';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly storageService: StorageService,
    private readonly imageService: ImageService,
  ) {}

  @Get('migrate-local')
  async migrateLocal() {
    console.log('Starting migration check...');
    const cwd = process.cwd();
    const possiblePaths = [
      join(cwd, 'uploads'),
      '/app/uploads',
      './uploads',
    ];
    
    console.log('Current working directory:', cwd);
    
    const results: any = {
      success: [],
      failed: [],
      skipped: [],
      checkedPaths: [],
    };

    for (const uploadsPath of possiblePaths) {
      results.checkedPaths.push(uploadsPath);
      console.log(`Checking path: ${uploadsPath}`);
      
      if (!fs.existsSync(uploadsPath)) {
        console.log(`Path does not exist: ${uploadsPath}`);
        continue;
      }

      const getAllFiles = (dir: string, fileList: string[] = []) => {
        try {
          const files = fs.readdirSync(dir);
          console.log(`Directory ${dir} contains ${files.length} items`);
          files.forEach((file) => {
            const filePath = join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
              getAllFiles(filePath, fileList);
            } else {
              fileList.push(filePath);
            }
          });
        } catch (e) {
          console.error(`Error reading directory ${dir}:`, (e as any).message);
        }
        return fileList;
      };

      const allFiles = getAllFiles(uploadsPath);
      console.log(`Found ${allFiles.length} total files in ${uploadsPath}`);

      for (const filePath of allFiles) {
        const relativeToUploads = filePath.replace(uploadsPath, '');
        const key = `uploads${relativeToUploads.startsWith('/') ? '' : '/'}${relativeToUploads}`;
        
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
          results.failed.push({ key, error: (err as any).message });
        }
      }
      
      if (allFiles.length > 0) break;
    }

    return {
      message: 'Migration completed',
      cwd,
      results,
    };
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('w') width?: number,
    @Query('h') height?: number,
    @Query('q') quality?: number,
    @Query('format') format?: 'webp' | 'jpeg' | 'png' | 'avif',
    @Query('crop') crop?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const isImage = file.mimetype.startsWith('image/') && !file.mimetype.includes('svg');
    
    let bufferToUpload = file.buffer;
    let targetFormat = extname(file.originalname).replace('.', '').toLowerCase();
    let contentType = file.mimetype;
    let optimizationStats: any = null;

    // Automatic Image Optimization with Sharp
    if (isImage) {
      const processed = await this.imageService.processImage(file.buffer, {
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        quality: quality ? Number(quality) : 80,
        format: format || 'webp',
        smartCrop: crop === 'true' || crop === 'smart',
      });

      bufferToUpload = processed.buffer;
      targetFormat = processed.format;
      contentType = processed.mimeType;

      optimizationStats = {
        width: processed.width,
        height: processed.height,
        originalSize: processed.originalSize,
        optimizedSize: processed.optimizedSize,
        saved: processed.compressionRatio,
      };
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}.${targetFormat}`;
    const key = `uploads/${filename}`;

    const publicUrl = await this.storageService.uploadBuffer(
      bufferToUpload,
      key,
      contentType,
    );

    return {
      success: true,
      message: 'File processed & uploaded successfully to AI CDN',
      url: publicUrl,
      filename: filename,
      originalName: file.originalname,
      size: bufferToUpload.length,
      mimetype: contentType,
      optimization: optimizationStats,
    };
  }
}
