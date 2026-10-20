import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const reviewsDataPath = path.join(rootDir, 'data', 'reviews.json');
const businessConfigPath = path.join(rootDir, 'config', 'business.json');

const config = JSON.parse(fs.readFileSync(businessConfigPath, 'utf8'));
const existingReviews = JSON.parse(fs.readFileSync(reviewsDataPath, 'utf8'));

console.log(`Current review pool size: ${existingReviews.length} total reviews`);
const usedCount = existingReviews.filter(r => r.used).length;
console.log(`Used reviews: ${usedCount}, Available reviews: ${existingReviews.length - usedCount}`);

const firstNames = [
  'Aakash', 'Aarav', 'Abhinav', 'Aditi', 'Alok', 'Amit', 'Anand', 'Aniket', 'Anjali', 'Ankita',
  'Anshul', 'Arjun', 'Arun', 'Ashish', 'Bhavna', 'Chetan', 'Deepak', 'Deepika', 'Devendra', 'Divya',
  'Gagandeep', 'Gaurav', 'Geeta', 'Gurpreet', 'Harish', 'Harleen', 'Ishaan', 'Jasleen', 'Jaspreet',
  'Karan', 'Kavita', 'Kiran', 'Kuldeep', 'Manish', 'Manoj', 'Meena', 'Mohit', 'Monika', 'Mukesh',
  'Naveen', 'Neeraj', 'Neha', 'Nitin', 'Pallavi', 'Pankaj', 'Pooja', 'Pradeep', 'Prashant', 'Praveen',
  'Priya', 'Rahul', 'Rajesh', 'Rajiv', 'Raman', 'Ravi', 'Ritu', 'Rohit', 'Sachin', 'Sameer',
  'Sandeep', 'Sanjay', 'Santosh', 'Sarita', 'Saurabh', 'Seema', 'Shalini', 'Shashi', 'Shikha', 'Shivani',
  'Shweta', 'Siddharth', 'Simran', 'Sneha', 'Sonia', 'Subhash', 'Sudhir', 'Suman', 'Sunil', 'Sunita',
  'Suresh', 'Tarun', 'Umesh', 'Varun', 'Vikas', 'Vikram', 'Vinay', 'Vinod', 'Vipul', 'Vishal'
];

const lastNames = [
  'Aggarwal', 'Ahluwalia', 'Anand', 'Arora', 'Bajaj', 'Bakshi', 'Bansal', 'Bhardwaj', 'Bhasin', 'Bhatia',
  'Chadha', 'Chauhan', 'Chawla', 'Chopra', 'Dhawan', 'Dua', 'Duggal', 'Garg', 'Gill', 'Goyal',
  'Grover', 'Gupta', 'Jain', 'Jindal', 'Joshi', 'Kapoor', 'Kashyap', 'Kaushik', 'Khanna', 'Khurana',
  'Kumar', 'Mahajan', 'Malhotra', 'Mehra', 'Mehta', 'Mittal', 'Narang', 'Nayyar', 'Oberoi', 'Pandey',
  'Puri', 'Rana', 'Rawat', 'Saini', 'Saxena', 'Sehgal', 'Sethi', 'Sharma', 'Shukla', 'Singla',
  'Sodhi', 'Soni', 'Sood', 'Talwar', 'Tandon', 'Thakur', 'Thapar', 'Tyagi', 'Vashisht', 'Verma', 'Walia'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomFullName() {
  return `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`;
}

// Category template generators
const categoryTemplates = {
  'certified-gemstones': [
    'Purchased a natural {stone} from Pink City Gems in Sector 23 Chandigarh. The brilliance and genuine lab certificate made the entire buying process seamless and trustworthy.',
    'Amazing collection of natural, untreated {stone}. The owner gave very detailed insight into gemstone origins and verified testing reports.',
    'Best place in Tricity for authentic {stone}. Excellent clarity and zero synthetic treatments. Very satisfied with my purchase!',
    'I visited Pink City Gems after researching gemstone dealers in Chandigarh. Their collection of certified {stone} is top quality and reasonably priced.',
    'Truly impressed by the quality of natural {stone} available here. The lab report provided all specifications including specific gravity and refractive index.'
  ],
  'astrological-consultation': [
    'Consulted them for my astrological birthstone according to Vedic principles. They suggested {stone} which has brought great calm and positive momentum.',
    'Very insightful consultation on rashi ratna in Sector 23 Chandigarh. They patiently answered all my queries regarding planetary effects.',
    'Pink City Gems is my go-to for energized Vedic gemstones. Got an astrological {stone} with exact auspicious timing instructions.',
    'Honest astrological guidance! Instead of pushing expensive gems, they recommended what truly suited my planetary charts. Highly recommended.',
    'Superb knowledge of gemstone astrology. The {stone} they energized for me has truly made a noticeable positive difference.'
  ],
  'healing-crystals': [
    'Bought natural {crystal} from Pink City Gems. The energy is wonderfully soothing and the quality is completely unadulterated.',
    'Their collection of authentic {crystal} and original Himalayan Rudraksha is one of the best in Chandigarh. Very peaceful ambiance.',
    'Pure natural minerals and crystal healing essentials! Got a {crystal} for my meditation practice and love the vibrations.',
    'Excellent shop for original Rudraksha and genuine {crystal}. Honest prices and friendly guidance on crystal cleansing.',
    'Purchased a beautiful {crystal} bracelet and pyramid. Authentic natural stones, not colored glass or cheap resins.'
  ],
  'custom-jewelry': [
    'Got a custom {metal} ring crafted for my {stone}. The open-back setting allows skin contact as per astrological norms and looks stunning.',
    'Exceptional craftsmanship! They designed a bespoke {metal} setting for my gemstone with great attention to detail and timely delivery.',
    'Had a custom {stone} pendant made here. High-end showroom finish at honest lapidary making charges in Sector 23.',
    'Very skilled jewelers for astrological rings in Chandigarh. The {metal} finish is smooth and comfortable for daily wear.',
    'Designed a personalized {stone} ring in {metal}. Flawless craftsmanship and accurate sizing on the very first try!'
  ],
  'wholesale-pricing': [
    'Direct wholesale prices on certified {stone} with genuine government recognized lab certificates. Saved significantly compared to retail showrooms in Chandigarh.',
    'Transparent pricing with per-carat rates clearly explained. No hidden making charges or arbitrary markups.',
    'Reliable gemstone wholesaler in Sector 23-C Chandigarh. They test every stone in front of you with proper gemological instruments.',
    'We regularly source certified gemstones from Pink City Gems. Consistently high quality and authentic certification for every piece.',
    'Fair, honest, and lab-backed pricing. Pink City Gems is setting the highest standards for ethical gemstone trading in Tricity.'
  ]
};

const stones = ['Ceylon Yellow Sapphire (Pukhraj)', 'Zambian Emerald (Panna)', 'Burma Ruby (Manik)', 'Blue Sapphire (Neelam)', 'Australian Opal', 'Italian Red Coral (Moonga)', 'Hessonite (Gomed)', 'Cat\'s Eye (Lehsuniya)'];
const crystals = ['Amethyst raw cluster', 'Rose Quartz pyramid', '7-Chakra bracelet', 'Black Tourmaline protection stone', 'Clear Quartz wand', 'Tiger Eye bracelet', 'Nepali 5-Mukhi Rudraksha', 'Pyrite wealth stone'];
const metals = ['sterling silver', '18k hallmarked gold', 'traditional Vedic Panchdhatu'];

function generateReview(categoryId, index) {
  const templates = categoryTemplates[categoryId] || categoryTemplates['certified-gemstones'];
  const template = templates[index % templates.length];
  const stone = getRandomItem(stones);
  const crystal = getRandomItem(crystals);
  const metal = getRandomItem(metals);

  let text = template
    .replace('{stone}', stone)
    .replace('{crystal}', crystal)
    .replace('{metal}', metal);

  return {
    id: `rev_${String(existingReviews.length + 1).padStart(3, '0')}`,
    categoryId,
    author: getRandomFullName(),
    rating: 5,
    text,
    used: false,
    createdAt: new Date().toISOString()
  };
}

// Replenish 25 new reviews (5 per category)
const categories = ['certified-gemstones', 'astrological-consultation', 'healing-crystals', 'custom-jewelry', 'wholesale-pricing'];
const newReviews = [];

for (const catId of categories) {
  for (let i = 0; i < 5; i++) {
    const rev = generateReview(catId, i);
    newReviews.push(rev);
  }
}

const updatedReviews = [...existingReviews, ...newReviews];
fs.writeFileSync(reviewsDataPath, JSON.stringify(updatedReviews, null, 2), 'utf8');
console.log(`✓ Added ${newReviews.length} fresh SEO reviews. Total pool size is now ${updatedReviews.length}.`);

// Also run asset generation to update data-bundle.js
const { execSync } = await import('node:child_process');
execSync('node scripts/generate_qr_assets.mjs', { cwd: rootDir, stdio: 'inherit' });
console.log('✓ Assets re-bundled successfully.');
