import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { StorageService } from '../common/services/storage.service';
import { ImageService } from '../common/services/image.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, StorageService, ImageService],
  exports: [StorageService, ImageService],
})
export class UploadModule {}
