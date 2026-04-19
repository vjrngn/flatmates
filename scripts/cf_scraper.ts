import puppeteer from 'puppeteer-core';
import TurndownService from 'turndown';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error('Missing Cloudflare credentials in .env.local');
  }

  const endpoint = `wss://browser-rendering.cloudflare.com/connect`;
  
  console.log('🌐 Connecting to Cloudflare Browser...');
  let browser;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: endpoint,
      headers: { 
        'Authorization': `Bearer ${API_TOKEN}`,
        'X-Cloudflare-Account-Id': ACCOUNT_ID
      }
    });
  } catch (e: any) {
    console.error('❌ Failed to connect to browser:', e?.message || e);
    return;
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const url = 'https://www.magicbricks.com/flats-for-rent-in-bangalore-pppfs';
    console.log(`🚀 Navigating to ${url}...`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait a bit for any dynamic overlays
    await new Promise(r => setTimeout(r, 10000));

    console.log('📝 Converting page to Markdown...');
    const html = await page.content();
    const turndown = new TurndownService();
    const markdown = turndown.turndown(html);

    console.log('🤖 Extracting structured data via OpenAI...');
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        listings: z.array(z.object({
          title: z.string(),
          rent: z.number().describe('Monthly rent in INR'),
          bhk_type: z.string().describe('e.g. 1BHK, 2BHK'),
          address: z.string().describe('Detailed address for geocoding'),
          amenities: z.array(z.string())
        }))
      }),
      prompt: `Extract exactly 5 rental listings from this markdown content of MagicBricks:\n\n${markdown.substring(0, 30000)}`
    });

    console.log(`📍 Geocoding ${object.listings.length} listings...`);
    const final_listings = [];

    for (const listing of object.listings) {
      try {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(listing.address)}&key=${GOOGLE_MAPS_KEY}`
        );
        const geoData = await geoRes.json();
        
        if (geoData.results?.[0]) {
          const { lat, lng } = geoData.results[0].geometry.location;
          final_listings.push({ ...listing, lat, lng });
        } else {
          console.warn(`Could not geocode: ${listing.address}`);
          final_listings.push(listing);
        }
      } catch (e) {
        final_listings.push(listing);
      }
    }

    fs.writeFileSync('./scripts/scraped_listings.json', JSON.stringify(final_listings, null, 2));
    console.log('✅ Success! Data saved to ./scripts/scraped_listings.json');

  } catch (err: any) {
    console.error('❌ Scraper failed:', err?.message || err);
  } finally {
    if (browser) await browser.close();
  }
}

run();
