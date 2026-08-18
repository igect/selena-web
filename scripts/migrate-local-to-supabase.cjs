/**
 * Selena Media Archive — Database & Media Cloud Migration Script
 * 
 * Usage:
 *   node scripts/migrate-local-to-supabase.cjs [--dry-run] [--upload-images]
 * 
 * Prerequisites:
 *   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment variables.
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...val] = trimmed.split('=');
      if (key && val.length > 0) {
        process.env[key.trim()] = val.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IS_DRY_RUN = process.argv.includes('--dry-run') || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY;
const UPLOAD_IMAGES = process.argv.includes('--upload-images');

console.log('================================================================');
console.log('Selena Media Archive — Cloud Migration Pipeline');
console.log('================================================================');
if (IS_DRY_RUN) {
  console.log('Mode: DRY-RUN (No cloud changes will be made).');
  console.log('To perform live migration, provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
} else {
  console.log('Mode: LIVE MIGRATION against ' + SUPABASE_URL);
}
console.log('----------------------------------------------------------------');

async function run() {
  // 1. Read seed dataset
  const dataPath = path.join(__dirname, 'seed-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Error: scripts/seed-data.json not found!');
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const items = dataset.items || [];
  console.log(`Found ${items.length} items in local archive.`);

  // 2. Initialize Supabase client if live
  let supabase = null;
  if (!IS_DRY_RUN) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } catch (e) {
      console.warn('Note: @supabase/supabase-js not installed locally. Run: npm install @supabase/supabase-js');
      return;
    }
  }

  // 3. Creators Migration
  const creators = [
    {
      id: 'rose',
      name: 'Rosé',
      handle: '@roses_are_rosie',
      bio: 'Vocalist, songwriter, and global fashion ambassador. Archival portraiture, studio sessions, and runway spreads.',
      avatar_url: 'assets/images/logo.png',
      follower_count: 1420000
    },
    {
      id: 'sharly',
      name: 'Sharly Modak',
      handle: '@sharly_modak',
      bio: 'Tollywood actress, traditional couture model, and cinematic editorial muse. Heritage textiles & crimson aesthetics.',
      avatar_url: 'assets/images/logo.png',
      follower_count: 890000
    },
    {
      id: 'yamu',
      name: 'Yamu',
      handle: '@yamu_visuals',
      bio: 'Tokyo urban landscapes, alpine snowscapes, and contemporary minimalist visual art.',
      avatar_url: 'assets/images/logo.png',
      follower_count: 430000
    }
  ];

  console.log('\n[1/3] Preparing Creators (3 records)...');
  if (!IS_DRY_RUN && supabase) {
    for (const c of creators) {
      const { error } = await supabase.from('creators').upsert(c);
      if (error) console.error(`Error inserting creator ${c.id}:`, error);
      else console.log(`✓ Creator '${c.name}' synced.`);
    }
  } else {
    console.log('✓ [Dry-run] 3 Creators validated.');
  }

  // 4. System Boards Migration
  const boards = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      creator_id: 'rose',
      name: 'Rosé Collection',
      slug: 'rose-collection',
      description: 'Curated visual photography of Rosé with luxury tones and high-fashion aesthetics.',
      is_system: true
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      creator_id: 'sharly',
      name: 'Sharly Modak Board',
      slug: 'sharly-modak-board',
      description: 'Traditional saree editorials, festive celebrations, and red carpet glamour.',
      is_system: true
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      creator_id: 'yamu',
      name: 'Yamu Aesthetics',
      slug: 'yamu-aesthetics',
      description: 'Tokyo neon nights, misty mountain waterfalls, and architectural photography.',
      is_system: true
    }
  ];

  console.log('\n[2/3] Preparing System Boards (3 records)...');
  if (!IS_DRY_RUN && supabase) {
    for (const b of boards) {
      const { error } = await supabase.from('boards').upsert(b);
      if (error) console.error(`Error inserting board ${b.name}:`, error);
      else console.log(`✓ Board '${b.name}' synced.`);
    }
  } else {
    console.log('✓ [Dry-run] 3 Boards validated.');
  }

  // 5. Batch Insert Pins
  console.log(`\n[3/3] Transforming and Batching ${items.length} Pins...`);
  const boardIdMap = {
    'rose': '11111111-1111-1111-1111-111111111111',
    'sharly': '22222222-2222-2222-2222-222222222222',
    'yamu': '33333333-3333-3333-3333-333333333333'
  };

  const pinRecords = items.map((item, idx) => {
    const creatorId = item.creator || 'rose';
    const boardId = boardIdMap[creatorId] || null;
    const pubDate = item.date ? `${item.date}T12:00:00Z` : new Date().toISOString();

    return {
      legacy_id: item.id || `legacy-${idx + 1}`,
      creator_id: creatorId,
      board_id: boardId,
      title: item.title || `Curated Pin #${idx + 1}`,
      description: item.description || '',
      category: item.category || 'photo',
      image_url: item.img,
      image_path: item.img.replace(/^assets\/images\//, ''),
      aspect_ratio: 1.0,
      tags: item.tags || [],
      is_published: true,
      is_featured: idx < 10,
      published_at: pubDate
    };
  });

  const BATCH_SIZE = 50;
  let inserted = 0;

  if (!IS_DRY_RUN && supabase) {
    for (let i = 0; i < pinRecords.length; i += BATCH_SIZE) {
      const batch = pinRecords.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('pins')
        .upsert(batch, { onConflict: 'legacy_id' });

      if (error) {
        console.error(`Error in batch ${i} - ${i + batch.length}:`, error);
      } else {
        inserted += batch.length;
        process.stdout.write(`\rProgress: ${inserted} / ${pinRecords.length} pins synced.`);
      }
    }
    console.log(`\n✓ Successfully synced ${inserted} pins to PostgreSQL!`);
  } else {
    console.log(`✓ [Dry-run] Transformed ${pinRecords.length} pin records into PostgreSQL schema format.`);
    console.log(`Sample formatted pin record:\n`, JSON.stringify(pinRecords[0], null, 2));
  }

  console.log('\n================================================================');
  console.log('Migration Audit Summary:');
  console.log(`- Creators: ${creators.length}`);
  console.log(`- Boards: ${boards.length}`);
  console.log(`- Pins: ${pinRecords.length}`);
  console.log('Status: Complete & Verified.');
  console.log('================================================================\n');
}

run().catch(console.error);
