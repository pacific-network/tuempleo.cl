import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from '../../repository/job_offer/job-offer.entity';
import { slugify } from './slugify.util';

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
  ) {}

  private get siteUrl(): string {
    return (process.env.PUBLIC_SITE_URL || 'https://tuempleo.cl').replace(/\/$/, '');
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private toIsoDate(d: Date | string | null | undefined): string {
    if (!d) return new Date().toISOString();
    const date = d instanceof Date ? d : new Date(d);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  async buildSitemapXml(): Promise<string> {
    const base = this.siteUrl;

    const ofertas = await this.ofertaRepository
      .createQueryBuilder('oferta')
      .select(['oferta.id', 'oferta.titulo', 'oferta.fecha_publicacion'])
      .where('oferta.es_activa = :activa', { activa: true })
      .andWhere('oferta.estado = :estado', { estado: 'publicada' })
      .orderBy('oferta.fecha_publicacion', 'DESC')
      .getMany();

    const today = new Date().toISOString();

    const staticUrls: Array<{ loc: string; lastmod: string; changefreq: string; priority: string }> = [
      { loc: `${base}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
      { loc: `${base}/empleos`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    ];

    const ofertaUrls = ofertas.map(o => {
      const slug = slugify(o.titulo);
      const path = slug ? `/empleos/${slug}-${o.id}` : `/empleos/${o.id}`;
      return {
        loc: this.escapeXml(`${base}${path}`),
        lastmod: this.toIsoDate(o.fecha_publicacion),
        changefreq: 'weekly',
        priority: '0.7',
      };
    });

    const urls = [...staticUrls, ...ofertaUrls];

    const body = urls
      .map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
  }

  buildRobotsTxt(): string {
    const base = this.siteUrl;
    return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  }
}
