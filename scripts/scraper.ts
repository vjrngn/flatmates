import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { writeFile } from 'fs/promises';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.FIRECRAWL_API_KEY;
const app = new FirecrawlApp({ apiKey });

const ResponseSchema = z.object({
  listings: z.array(z.object({
    title: z.string(),
    rent: z.number(),
    address: z.string()
  }))
});

async function runScraper() {
  const url = 'https://www.nobroker.in/property/rent/bangalore/2bhk%20flats?searchParam=W3sibGF0IjoxMy4wNjExMjQ0LCJsb24iOjc3LjYwMzI1OTI5OTk5OTk5LCJwbGFjZUlkIjoiQ2hJSlFWeVdsWEVacmpzUnd5cGp3WFJHUXBRIiwicGxhY2VOYW1lIjoiMmJoayBmbGF0cyJ9XQ==&radius=2.0&sharedAccomodation=0&city=bangalore&locality=2bhk%20flats';
  console.log(`🚀 Final attempt for MagicBricks with different settings...`);

  try {
    const result = await app.scrape(url, {
      formats: [
        {
          type: 'json',
          schema: ResponseSchema,
        }
      ],
      mobile: true,
      waitFor: 5000
    }) as any;

    await writeFile('./scripts/scrape_log.txt', JSON.stringify(result));
    return;

    if (!result.success) {
      console.log("Full Result Object:", JSON.stringify(result, null, 2));
      return;
    }

    console.log("SUCCESS!");
    fs.writeFileSync('./scripts/scraped_listings.json', JSON.stringify(result.json, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runScraper();
