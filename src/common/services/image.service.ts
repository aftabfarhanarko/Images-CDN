import { Injectable, BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export interface ProcessedImageResult {
  buffer: Buffer;
  format: string;
  mimeType: string;
  width?: number;
  height?: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: string;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  smartCrop?: boolean;
}

@Injectable()
export class ImageService {
  /**
   * Optimize and convert uploaded image buffer using Sharp.
   * Auto converts PNG/JPEG to lightweight WebP with high compression efficiency.
   */
  async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImageResult> {
    try {
      const metadata = await sharp(buffer).metadata();
      const originalSize = buffer.length;

      if (!metadata.format) {
        throw new BadRequestException('Unsupported or corrupt image format');
      }

      let pipeline = sharp(buffer, { failOn: 'none' });

      // Apply Smart Resizing & Cropping if requested
      if (options.width || options.height) {
        pipeline = pipeline.resize({
          width: options.width ? Number(options.width) : undefined,
          height: options.height ? Number(options.height) : undefined,
          fit: options.smartCrop ? sharp.fit.cover : sharp.fit.inside,
          position: options.smartCrop ? sharp.strategy.entropy : 'center',
          withoutEnlargement: true,
        });
      }

      // Target Format & Quality Settings
      const targetFormat = options.format || 'webp';
      const targetQuality = options.quality ? Number(options.quality) : 80;

      if (targetFormat === 'webp') {
        pipeline = pipeline.webp({ quality: targetQuality, effort: 4 });
      } else if (targetFormat === 'avif') {
        pipeline = pipeline.avif({ quality: targetQuality, effort: 4 });
      } else if (targetFormat === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: targetQuality, mozjpeg: true });
      } else if (targetFormat === 'png') {
        pipeline = pipeline.png({ compressionLevel: 8 });
      }

      const processedBuffer = await pipeline.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();
      const optimizedSize = processedBuffer.length;

      const compressionRatio =
        originalSize > 0
          ? `${(((originalSize - optimizedSize) / originalSize) * 100).toFixed(1)}%`
          : '0%';

      return {
        buffer: processedBuffer,
        format: targetFormat,
        mimeType: `image/${targetFormat}`,
        width: processedMetadata.width,
        height: processedMetadata.height,
        originalSize,
        optimizedSize,
        compressionRatio,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get metadata of an image
   */
  async getMetadata(buffer: Buffer) {
    return sharp(buffer).metadata();
  }
}
