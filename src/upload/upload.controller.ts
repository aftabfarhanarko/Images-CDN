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
    console.log('Starting migration check...');
    const cwd = process.cwd();
    const possiblePaths = [
      join(cwd, 'uploads'),
      '/app/uploads',
      './uploads'
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
          console.error(`Error reading directory ${dir}:`, e.message);
        }
        return fileList;
      };

      const allFiles = getAllFiles(uploadsPath);
      console.log(`Found ${allFiles.length} total files in ${uploadsPath}`);

      for (const filePath of allFiles) {
        // Create key based on path relative to uploadsPath to keep structure
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
      
      // If we found files in one path, we stop
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
    @UploadedFile() file: any,
    @Req() req: any,
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
