import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { StorageService } from '../common/services/storage.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, StorageService],
})
export class UploadModule {}
