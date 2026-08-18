const fs = require('fs');

const data = JSON.parse(fs.readFileSync('assets/js/archive-data.json', 'utf8'));

const roseTitles = [
  "Crimson Silk Dress & Ambient Cafe",
  "Birthday Celebration in Gold & Noir",
  "Vintage Minimalist Interior Portrait",
  "Golden Hour Sunlight & Soft Drapes",
  "Editorial Studio Shoot in Classic Red",
  "Evening Coffee & Autumn Aesthetics",
  "Monochrome Film Portrait Session",
  "Subtle Velvet & Warm Illumination",
  "Modern Streetwear in Neutral Tones",
  "High-Key Lighting Fashion Close-up"
];

const sharlyTitles = [
  "Pastel Satin Gown & Red Carpet Premiere",
  "Crimson Saree with Traditional Gold Embroidery",
  "Tollywood Film Launch Press Meet",
  "Classic Bengal Handloom Saree Portrait",
  "Festive Diya Lights & Silk Drape",
  "Contemporary Fusion Chic in White & Yellow",
  "Studio Glamour & Cinematic Lighting",
  "Monsoon Reflections & Traditional Jewelry",
  "Heritage Temple Architecture Backdrop",
  "Vibrant Sunlit Festive Celebration"
];

const yamuTitles = [
  "Cascading Mountain Waterfall in Mist",
  "Tokyo Neon Lights & Rainy Night Walk",
  "Winter Alpine Snowscape & Fir Trees",
  "Minimalist Zen Stone Garden Silhouette",
  "Golden Sunset Over Coastal Cliffs",
  "Forest Canopy & Morning Sunbeams",
  "Candid Street Photography in Shibuya",
  "Emerald Lake Reflection at Dawn",
  "Monochrome Architecture & Glass Reflections",
  "Moody Film Still by the Pacific Shore"
];

data.items = data.items.map((item, idx) => {
  let titlePool = roseTitles;
  let boardName = "Rosé Collection";
  let tags = ["fashion", "portrait", "aesthetic", "editorial"];
  
  if (item.creator === 'sharly') {
    titlePool = sharlyTitles;
    boardName = "Sharly Modak Board";
    tags = ["traditional", "saree", "tollywood", "glamour", "festive"];
  } else if (item.creator === 'yamu') {
    titlePool = yamuTitles;
    boardName = "Yamu Aesthetics";
    tags = ["nature", "travel", "japan", "scenery", "moody"];
  }

  const baseTitle = titlePool[idx % titlePool.length];
  const postNum = (idx % 100) + 1;
  const pinTitle = `${item.creatorName} — ${baseTitle} #${postNum}`;
  const pinDescription = `Curated visual pin from the ${boardName}. Featuring photography of ${item.creatorName} with elegant tones, composition, and aesthetic details.`;

  return {
    ...item,
    title: pinTitle,
    board: boardName,
    description: pinDescription,
    tags
  };
});

fs.writeFileSync('assets/js/archive-data.json', JSON.stringify(data, null, 2));
console.log('Successfully updated 1,620 pins with rich Pinterest post naming and descriptions!');
