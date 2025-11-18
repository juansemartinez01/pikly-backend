// src/files/files.controller.ts
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import type { Multer } from 'multer';

@Controller('files')
export class FilesController {
  constructor(@Inject('CLOUDINARY') private readonly cloudinary: any) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Multer.File) {
  
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      // Subimos a Cloudinary usando el buffer en memoria
      const result = await new Promise<any>((resolve, reject) => {
        const upload = this.cloudinary.uploader.upload_stream(
          {
            folder: 'frutas', // poné el folder que quieras
            resource_type: 'image',
          },
          (error: any, res: any) => {
            if (error) {
              return reject(error);
            }
            resolve(res);
          },
        );

        upload.end(file.buffer); // importante: enviar el buffer
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error: any) {
      // Log opcional
      // console.error('Cloudinary upload error:', error);
      throw new InternalServerErrorException('Failed to upload image');
    }
  }

  // ================== DELETE ==================
  @Delete('delete/:publicId')
  async deleteFile(@Param('publicId') publicId: string) {
    try {
      const result = await this.cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok') {
        throw new HttpException(
          'Failed to delete image',
          HttpStatus.BAD_REQUEST,
        );
      }
      return { message: 'Image deleted successfully' };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Internal error deleting image',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ================== LIST ==================
  @Get('list')
  async listFiles() {
    try {
      const result = await this.cloudinary.api.resources({
        type: 'upload',
        // folder opcional, si usás uno:
        prefix: 'frutas/', // o el folder que pusiste arriba
        max_results: 500,
      });

      return result.resources.map((file: any) => ({
        url: file.secure_url,
        public_id: file.public_id,
      }));
    } catch (error: any) {
      throw new HttpException(
        'Failed to fetch images',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
