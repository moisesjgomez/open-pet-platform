import { Pet } from '@/lib/adapters/base';

// ==========================================
// 1. BIO GENERATOR (Creative Writer)
// Used by: Admin Intake Form
// ==========================================
export async function generatePetBio(name: string, breed: string, tags: string[]): Promise<string> {
  // Simulate "Thinking" time
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Fallback if no tags
  if (tags.length === 0) {
    return `${name} is a beautiful ${breed} looking for a loving home. Come meet this amazing friend today!`;
  }

  // Join tags naturally (e.g., "Playful, Smart and Fast")
  const traits = tags.map(t => t.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1');

  // Dynamic Templates
  const templates = [
    `Meet ${name}! This ${breed} is best known for being ${traits}. If you are looking for a companion who matches that vibe, ${name} is the one for you.`,
    `${name} is a one-of-a-kind ${breed}. We describe ${name} as ${traits}. Ideally, we are looking for a home that appreciates these unique qualities!`,
    `Are you looking for a ${breed} that is ${traits}? Then you need to meet ${name}. Stop by the shelter today for a meet-and-greet.`,
    `Everyone at the shelter loves ${name}. This ${breed} is ${traits} and ready to find a forever family. Could that be you?`
  ];

  // Pick a random template
  return templates[Math.floor(Math.random() * templates.length)];
}


// ==========================================
// 2. TAG EXTRACTOR (Data Analyst)
// Used by: Repository (to clean Shelterluv data) & Intake Form
// ==========================================
export async function extractTagsFromBio(bio: string): Promise<string[]> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 800));

  const lowerBio = bio.toLowerCase();
  const foundTags: string[] = [];

  // Energy Levels
  if (lowerBio.includes('hike') || lowerBio.includes('run') || lowerBio.includes('active') || lowerBio.includes('play')) {
    foundTags.push('High Energy');
  }
  if (lowerBio.includes('couch') || lowerBio.includes('relax') || lowerBio.includes('calm') || lowerBio.includes('nap')) {
    foundTags.push('Chill');
  }

  // Social Skills
  if (lowerBio.includes('kid') || lowerBio.includes('family') || lowerBio.includes('child')) {
    foundTags.push('Good with Kids');
  }
  if (lowerBio.includes('dog') && (lowerBio.includes('play') || lowerBio.includes('friend'))) {
    foundTags.push('Dog Friendly');
  }

  // Special Traits
  if (lowerBio.includes('smart') || lowerBio.includes('trick') || lowerBio.includes('train')) {
    foundTags.push('Smart');
  }
  if (lowerBio.includes('snuggle') || lowerBio.includes('cuddle') || lowerBio.includes('lap')) {
    foundTags.push('Affectionate');
  }
  if (lowerBio.includes('quiet') || lowerBio.includes('shy')) {
    foundTags.push('Quiet');
  }

  // Age Heuristics
  if (lowerBio.includes('senior') || lowerBio.includes('years young')) {
    foundTags.push('Senior');
  }
  if (lowerBio.includes('puppy') || lowerBio.includes('kitten')) {
    foundTags.push('Baby');
  }

  // Remove duplicates and return
  return Array.from(new Set(foundTags));
}


// ==========================================
// 3. MATCHMAKER (Chatbot Logic)
// Used by: AIChatWidget
// ==========================================
export async function findMatch(query: string, allPets: Pet[], context?: string): Promise<{ text: string, pets: Pet[], nextContext?: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  const lowerQuery = query.toLowerCase();

  // --- STAGE 0: GREETING ---
  if (lowerQuery.includes('hi') || lowerQuery.includes('hello')) {
    return {
      text: "Hello! I can help you find a pet. First, are you looking for a Dog or a Cat?",
      pets: [],
      nextContext: 'species_selection'
    };
  }

  // --- STAGE 1: SPECIES FILTER ---
  let filtered = allPets;
  let detectedSpecies = '';
  
  // Basic Species Detection
  if (lowerQuery.includes('dog')) {
    filtered = allPets.filter(p => !p.breed.includes('Cat') && !p.breed.includes('Tabby') && !p.breed.includes('Siamese'));
    detectedSpecies = 'dogs';
  } else if (lowerQuery.includes('cat')) {
    filtered = allPets.filter(p => p.breed.includes('Cat') || p.breed.includes('Tabby') || p.breed.includes('Siamese'));
    detectedSpecies = 'cats';
  }

  // If user says "Dog" but gives no traits, ask for lifestyle
  if (detectedSpecies && !lowerQuery.includes('active') && !lowerQuery.includes('chill') && !lowerQuery.includes('kid')) {
    return {
      text: `Great, I love ${detectedSpecies}! Now, what is your lifestyle like? Do you want an Active pet for adventures, or a Chill pet for relaxing?`,
      pets: [],
      nextContext: 'lifestyle_selection'
    };
  }

  // --- STAGE 2: LIFESTYLE / KEYWORD FILTER ---
  const traits: string[] = [];
  
  // Apartment / Small
  if (lowerQuery.includes('apartment') || lowerQuery.includes('small') || lowerQuery.includes('condo')) {
    filtered = filtered.filter(p => 
      p.tags.some(t => ['Small', 'Cat', 'Chill'].includes(t)) || 
      p.breed.includes('Cat')
    );
    traits.push("apartment living");
  }

  // Active
  if (lowerQuery.includes('active') || lowerQuery.includes('run') || lowerQuery.includes('hike') || lowerQuery.includes('energy')) {
    filtered = filtered.filter(p => p.tags.includes('High Energy'));
    traits.push('high energy');
  }

  // Chill
  if (lowerQuery.includes('chill') || lowerQuery.includes('lazy') || lowerQuery.includes('calm') || lowerQuery.includes('senior')) {
    filtered = filtered.filter(p => p.tags.includes('Chill') || p.tags.includes('Senior'));
    traits.push('calm vibes');
  }

  // Family
  if (lowerQuery.includes('kid') || lowerQuery.includes('family') || lowerQuery.includes('child')) {
    filtered = filtered.filter(p => p.tags.includes('Good with Kids'));
    traits.push('family-friendly');
  }

  // --- FINAL RESULTS ---
  const totalFound = filtered.length;
  // We allow up to 5 cards
  const topMatches = filtered.slice(0, 5);
  
  if (totalFound === 0) {
    return {
      text: "I looked through our database, but I couldn't find a perfect match for those specific criteria. However, here are some of our staff favorites who need a home!",
      pets: allPets.slice(0, 3)
    };
  }

  let intro = traits.length > 0 
    ? `Based on your interest in ${traits.join(' and ')}, I found ${totalFound} matches!`
    : `I found ${totalFound} possible friends for you.`;

  if (totalFound > 5) {
    intro += ` Here are the top 5:`;
  } else {
    intro += ` Here they are:`;
  }

  return {
    text: intro,
    pets: topMatches
  };
}