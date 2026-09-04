import { Injectable, BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { extname } from 'path';

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
];

const allowedExtensions = ['.jpeg', '.jpg', '.png', '.webp', '.avif', '.gif', '.svg'];

export const multerConfig = {
  storage: memoryStorage(),
  fileFilter: (req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.includes(ext);

    if (isValidMimeType && isValidExtension) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `Invalid file type. Only ${allowedExtensions.join(', ')} are allowed.`,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
};

@Injectable()
export class UploadService {
  getPublicUrl(filename: string, baseUrl?: string): string {
    if (baseUrl) {
      return `${baseUrl}/uploads/${filename}`;
    }
    // Fallback: use environment variable or default
    const backendUrl = process.env.BACKEND_URL;
    return `${backendUrl}/uploads/${filename}`;
  }
}
