import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnrichmentClient } from './enrichment.client';
import { EnrichmentService } from './enrichment.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: Number(configService.get<string>('HTTP_TIMEOUT', '5000')),
      }),
    }),
  ],
  providers: [EnrichmentClient, EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
