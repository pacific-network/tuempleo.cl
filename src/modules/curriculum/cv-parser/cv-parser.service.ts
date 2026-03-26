import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ParsedCvData } from './cv-parser.interface';
import {
  SECTION_PATTERNS,
  YEAR_RANGE_PATTERN,
  EMAIL_PATTERN,
  PHONE_PATTERN,
  KNOWN_UNIVERSITIES,
  KNOWN_LANGUAGES,
  LANGUAGE_LEVELS,
} from './cv-parser.constants';

@Injectable()
export class CvParserService {
  private readonly logger = new Logger(CvParserService.name);

  async parseFromFile(filePath: string): Promise<ParsedCvData> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.pdf') {
      return {};
    }

    if (!fs.existsSync(filePath)) {
      this.logger.warn(`File not found: ${filePath}`);
      return {};
    }

    const { PDFParse } = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(dataBuffer) });
    const pdfData = await parser.getText();
    const text = pdfData.text;

    if (!text || text.trim().length < 50) {
      this.logger.warn('PDF text too short to parse meaningfully');
      return {};
    }

    return this.parseText(text);
  }

  parseText(text: string): ParsedCvData {
    const sections = this.splitIntoSections(text);

    return {
      datos_personales: this.extractPersonalData(
        sections.datos_personales || text.substring(0, 500),
      ),
      educacion: this.extractEducation(sections.educacion || ''),
      experiencias: this.extractExperience(sections.experiencia || ''),
      idiomas: this.extractLanguages(sections.idiomas || text),
    };
  }

  private splitIntoSections(text: string): Record<string, string> {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const sections: Record<string, string> = {};
    let currentSection: string | null = null;
    const sectionLines: Record<string, string[]> = {};

    for (const line of lines) {
      let matched = false;
      for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
        if (pattern.test(line) && line.length < 60) {
          currentSection = key;
          if (!sectionLines[key]) sectionLines[key] = [];
          matched = true;
          break;
        }
      }
      if (!matched && currentSection) {
        if (!sectionLines[currentSection]) sectionLines[currentSection] = [];
        sectionLines[currentSection].push(line);
      }
    }

    for (const [key, value] of Object.entries(sectionLines)) {
      sections[key] = value.join('\n');
    }

    return sections;
  }

  private extractPersonalData(
    text: string,
  ): ParsedCvData['datos_personales'] {
    const result: ParsedCvData['datos_personales'] = {};

    const phoneMatch = text.match(PHONE_PATTERN);
    if (phoneMatch) {
      result.telefono = phoneMatch[0].replace(/\s+/g, '');
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private extractEducation(text: string): ParsedCvData['educacion'] {
    if (!text.trim()) return undefined;

    const entries: NonNullable<ParsedCvData['educacion']> = [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Try to find university/institution mentions
    const uniPattern = new RegExp(
      `(${KNOWN_UNIVERSITIES.join('|')})`,
      'i',
    );

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const uniMatch = line.match(uniPattern);

      if (uniMatch) {
        const entry: NonNullable<ParsedCvData['educacion']>[0] = {
          titulo: '',
          institucion: uniMatch[0].trim(),
        };

        // Look for a title in the same line or adjacent lines
        const titlePart = line.replace(uniMatch[0], '').trim().replace(/^[-–—:,]\s*/, '').replace(/[-–—:,]\s*$/, '');
        if (titlePart.length > 3) {
          entry.titulo = titlePart;
        } else if (i > 0 && !uniPattern.test(lines[i - 1])) {
          entry.titulo = lines[i - 1].replace(/[-–—:,]\s*$/, '').trim();
        } else if (i + 1 < lines.length && !uniPattern.test(lines[i + 1])) {
          entry.titulo = lines[i + 1].replace(/^[-–—:,]\s*/, '').trim();
        }

        // Look for year range in surrounding lines
        const context = [lines[i - 1], line, lines[i + 1]]
          .filter(Boolean)
          .join(' ');
        const yearMatch = context.match(YEAR_RANGE_PATTERN);
        if (yearMatch) {
          entry.anno_inicio = yearMatch[1];
          const end = yearMatch[2].toLowerCase();
          entry.anno_termino =
            end === 'presente' || end === 'actual' || end === 'actualidad' || end === 'la fecha'
              ? undefined
              : yearMatch[2];
        }

        entries.push(entry);
      }
      i++;
    }

    // Fallback: if no universities found, try generic parsing
    if (entries.length === 0) {
      const yearRangeLines = lines.filter((l) => YEAR_RANGE_PATTERN.test(l));
      for (const line of yearRangeLines.slice(0, 3)) {
        const yearMatch = line.match(YEAR_RANGE_PATTERN);
        if (yearMatch) {
          const cleaned = line
            .replace(YEAR_RANGE_PATTERN, '')
            .replace(/[-–—,|]\s*/g, ' ')
            .trim();
          if (cleaned.length > 3) {
            entries.push({
              titulo: cleaned,
              institucion: '',
              anno_inicio: yearMatch[1],
              anno_termino:
                /presente|actual/i.test(yearMatch[2])
                  ? undefined
                  : yearMatch[2],
            });
          }
        }
      }
    }

    return entries.length > 0 ? entries : undefined;
  }

  private extractExperience(text: string): ParsedCvData['experiencias'] {
    if (!text.trim()) return undefined;

    const entries: NonNullable<ParsedCvData['experiencias']> = [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Strategy: look for lines with year ranges as anchors
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const yearMatch = line.match(YEAR_RANGE_PATTERN);

      if (yearMatch) {
        const cleaned = line
          .replace(YEAR_RANGE_PATTERN, '')
          .replace(/[()]/g, '')
          .trim();

        // Try to split "Cargo - Empresa" or "Cargo en Empresa" patterns
        const parts =
          cleaned.split(/\s+[-–—|]\s+/) ||
          cleaned.split(/\s+en\s+/i);

        const entry: NonNullable<ParsedCvData['experiencias']>[0] = {
          cargo: parts[0]?.trim() || cleaned,
          empresa: parts[1]?.trim() || '',
          anno_inicio: yearMatch[1],
          anno_termino: /presente|actual|la\s+fecha/i.test(yearMatch[2])
            ? undefined
            : yearMatch[2],
        };

        // If empresa is empty, check the next line
        if (!entry.empresa && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (
            !YEAR_RANGE_PATTERN.test(nextLine) &&
            nextLine.length < 80 &&
            !SECTION_PATTERNS.experiencia.test(nextLine)
          ) {
            entry.empresa = nextLine;
          }
        }

        // Collect description lines
        const descLines: string[] = [];
        let j = i + 1;
        if (!entry.empresa) j = i + 1;
        else if (entry.empresa === lines[i + 1]) j = i + 2;
        else j = i + 1;

        while (
          j < lines.length &&
          !YEAR_RANGE_PATTERN.test(lines[j]) &&
          j - i <= 5
        ) {
          const dLine = lines[j];
          // Stop if we hit another section header
          if (
            Object.values(SECTION_PATTERNS).some(
              (p) => p.test(dLine) && dLine.length < 60,
            )
          ) {
            break;
          }
          if (dLine.length > 10) {
            descLines.push(dLine.replace(/^[-•*]\s*/, ''));
          }
          j++;
        }

        if (descLines.length > 0) {
          entry.descripcion = descLines.join('. ');
        }

        entries.push(entry);
      }
    }

    return entries.length > 0 ? entries : undefined;
  }

  private extractLanguages(text: string): ParsedCvData['idiomas'] {
    const entries: NonNullable<ParsedCvData['idiomas']> = [];

    for (const lang of KNOWN_LANGUAGES) {
      if (lang.pattern.test(text)) {
        // Find the line containing the language to detect level
        const lines = text.split('\n');
        const langLine = lines.find((l) => lang.pattern.test(l)) || '';

        let level: string | undefined;
        for (const lvl of LANGUAGE_LEVELS) {
          if (lvl.pattern.test(langLine)) {
            level = lvl.level;
            break;
          }
        }

        entries.push({
          idioma: lang.name,
          nivel_oral: level,
          nivel_escrito: level,
        });
      }
    }

    return entries.length > 0 ? entries : undefined;
  }
}
