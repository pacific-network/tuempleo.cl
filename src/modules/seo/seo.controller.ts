import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { SeoService } from './seo.service';

@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap(@Res() res: Response) {
    const xml = await this.seoService.buildSitemapXml();
    res.send(xml);
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=86400')
  robots(@Res() res: Response) {
    res.send(this.seoService.buildRobotsTxt());
  }
}
