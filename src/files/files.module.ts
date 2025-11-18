import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { CloudinaryProvider } from './cloudinary.provider';

@Module({
  imports: [
    MulterModule.register({}),
  ],
  controllers: [FilesController],
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class FilesModule {}
