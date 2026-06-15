import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import pdfParse from 'pdf-parse';

export async function fetchAndExtractText(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const contentType = response.headers['content-type'] || '';
    
    // Handle PDFs
    if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(response.data);
      return data.text;
    }

    // Handle HTML using JSDOM and Mozilla Readability
    const html = response.data.toString('utf-8');
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (article && article.textContent) {
      return article.textContent;
    }
    
    // Fallback to basic cheerio text extraction if readability fails
    const $ = cheerio.load(html);
    return $('body').text().replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.warn(`[Scraper] Failed to fetch ${url}: ${error.message}`);
    return null;
  }
}

export function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text) return [];
  // Basic word-based chunking
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const chunks = [];
  
  if (words.length <= chunkSize) {
    return [words.join(' ')];
  }
  
  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    if (i + chunkSize >= words.length) break;
  }
  
  return chunks;
}
