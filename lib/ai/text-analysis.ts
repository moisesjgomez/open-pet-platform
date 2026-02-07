/**
 * AI Text Analysis Engine
 * Centralizes all heuristic logic for extracting personality traits, tags, and attributes
 * from raw pet data (breed names, descriptions, ages, etc.)
 */

// BREED TRAIT MAPPING
const BREED_TRAITS: Record<string, string[]> = {
  'RETRIEVER': ['Friendly', 'Good with Kids', 'Playful'],
  'LABRADOR': ['Friendly', 'Good with Kids', 'Playful'],
  'SHEPHERD': ['Smart', 'High Energy', 'Protective'],
  'MALINOIS': ['Smart', 'High Energy', 'Protective'],
  'HUSKY': ['Vocal', 'High Energy', 'Escape Artist'],
  'MALAMUTE': ['Vocal', 'High Energy', 'Escape Artist'],
  'BULLDOG': ['Chill', 'Couch Potato', 'Snorer'],
  'PUG': ['Chill', 'Couch Potato', 'Snorer'],
  'TERRIER': ['Tenacious', 'High Energy', 'Smart'],
  'CHIHUAHUA': ['Loyal', 'Lap Dog', 'Vocal'],
  'PIT': ['Affectionate', 'Strong', 'Loyal'],
  'STAFF': ['Affectionate', 'Strong', 'Loyal'],
  'HOUND': ['Nose Work', 'Vocal', 'Food Motivated'],
  'BEAGLE': ['Nose Work', 'Vocal', 'Food Motivated'],
  'BOXER': ['Goofy', 'High Energy', 'Playful'],
  'POODLE': ['Smart', 'Hypoallergenic', 'Active'],
  'DOMESTIC SH': ['Low Maintenance', 'Independent'],
  'DOMESTIC MH': ['Low Maintenance', 'Independent'],
  'SIAMESE': ['Vocal', 'Social', 'Smart'],
  'MAINE COON': ['Gentle Giant', 'Fluffy', 'Friendly'],
};

// COLOR/PATTERN TRAITS (For cats mostly)
const COLOR_TRAITS: Record<string, string[]> = {
  'TABBY': ['Striped'],
  'CALICO': ['Sassy', 'Tortitude'],
  'TORTIE': ['Sassy', 'Tortitude'],
  'BLACK': ['Sleek'],
  'WHITE': ['Snowy'],
};

// DESCRIPTION KEYWORD ANALYSIS
const DESCRIPTION_KEYWORDS: Record<string, string[]> = {
  'run': ['High Energy', 'Active'],
  'hike': ['High Energy', 'Active'],
  'active': ['High Energy', 'Active'],
  'play': ['Playful', 'High Energy'],
  'couch': ['Chill', 'Couch Potato'],
  'relax': ['Chill', 'Low Energy'],
  'calm': ['Chill', 'Low Energy'],
  'nap': ['Chill', 'Low Energy'],
  'kid': ['Good with Kids'],
  'family': ['Good with Kids'],
  'child': ['Good with Kids'],
  'smart': ['Smart'],
  'train': ['Smart', 'Trainable'],
  'gentle': ['Gentle', 'Good with Kids'],
  'friendly': ['Friendly', 'Social'],
  'vocal': ['Vocal', 'Talkative'],
  'quiet': ['Quiet', 'Low Energy'],
  'lap': ['Lap Dog', 'Affectionate'],
  'cuddle': ['Affectionate', 'Cuddly'],
};

/**
 * Analyze breed name and extract personality traits
 */
export function analyzeBreed(breed: string): string[] {
  const upperBreed = breed.toUpperCase();
  const tags: string[] = [];
  
  Object.entries(BREED_TRAITS).forEach(([key, traits]) => {
    if (upperBreed.includes(key)) {
      tags.push(...traits);
    }
  });
  
  return tags;
}

/**
 * Analyze color/pattern and extract traits (mainly for cats)
 */
export function analyzeColor(color: string): string[] {
  const upperColor = color.toUpperCase();
  const tags: string[] = [];
  
  Object.entries(COLOR_TRAITS).forEach(([key, traits]) => {
    if (upperColor.includes(key)) {
      tags.push(...traits);
    }
  });
  
  return tags;
}

/**
 * Analyze description text for personality keywords
 */
export function analyzeDescription(description: string): string[] {
  const lowerDesc = description.toLowerCase();
  const tags: string[] = [];
  
  Object.entries(DESCRIPTION_KEYWORDS).forEach(([keyword, traits]) => {
    if (lowerDesc.includes(keyword)) {
      tags.push(...traits);
    }
  });
  
  return tags;
}

/**
 * Determine age category from age string
 */
export function determineAgeCategory(ageString: string): 'Baby' | 'Young' | 'Adult' | 'Senior' {
  const age = ageString.toLowerCase();
  
  if (age.includes('month') || age.includes('week')) return 'Baby';
  
  const match = age.match(/\d+/);
  if (!match) return 'Adult';
  
  const years = parseInt(match[0]);
  if (years < 2) return 'Young';
  if (years >= 8) return 'Senior';
  
  return 'Adult';
}

/**
 * Determine energy level from description and age
 */
export function determineEnergyLevel(
  description: string, 
  ageCategory: string,
  tags: string[]
): 'Low' | 'Moderate' | 'High' {
  if (tags.includes('High Energy') || tags.includes('Active') || tags.includes('Playful')) {
    return 'High';
  }
  
  if (tags.includes('Chill') || tags.includes('Senior') || tags.includes('Couch Potato') || ageCategory === 'Senior') {
    return 'Low';
  }
  
  return 'Moderate';
}

/**
 * Determine size from description and breed
 */
export function determineSize(
  description: string,
  breed: string,
  petSize?: string
): 'Small' | 'Medium' | 'Large' | 'Extra Large' {
  if (petSize) {
    if (petSize.toUpperCase() === 'SMALL') return 'Small';
    if (petSize.toUpperCase() === 'LARGE') return 'Large';
    if (petSize.toUpperCase() === 'X-LARGE') return 'Extra Large';
  }
  
  const lowerDesc = description.toLowerCase();
  const upperBreed = breed.toUpperCase();
  
  if (lowerDesc.includes('small') || lowerDesc.includes('tiny') || lowerDesc.includes('lap') ||
      upperBreed.includes('CHIHUAHUA') || upperBreed.includes('TERRIER')) {
    return 'Small';
  }
  
  if (lowerDesc.includes('large') || lowerDesc.includes('big') || lowerDesc.includes('giant') ||
      upperBreed.includes('SHEPHERD') || upperBreed.includes('RETRIEVER') || upperBreed.includes('NEWFOUNDLAND')) {
    return 'Large';
  }
  
  return 'Medium';
}

/**
 * MASTER FUNCTION: Generate comprehensive tags for a pet
 */
export function generateSmartTags(params: {
  breed: string;
  color?: string;
  description: string;
  age: string;
  animalType: string;
  petSize?: string;
}): {
  tags: string[];
  energyLevel: 'Low' | 'Moderate' | 'High';
  size: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  ageCategory: 'Baby' | 'Young' | 'Adult' | 'Senior';
} {
  let tags: string[] = [];
  
  // 1. Animal Type
  if (params.animalType === 'DOG') tags.push('Dog');
  if (params.animalType === 'CAT') tags.push('Cat');
  
  // 2. Breed Analysis
  tags.push(...analyzeBreed(params.breed));
  
  // 3. Color Analysis (if provided)
  if (params.color) {
    tags.push(...analyzeColor(params.color));
  }
  
  // 4. Description Analysis
  tags.push(...analyzeDescription(params.description));
  
  // 5. Age Analysis
  const ageCategory = determineAgeCategory(params.age);
  if (ageCategory === 'Baby') tags.push('Puppy/Kitten', 'Needs Training', 'High Energy');
  if (ageCategory === 'Senior') tags.push('Senior', 'Chill', 'Wise');
  if (ageCategory === 'Young') tags.push('Young');
  if (ageCategory === 'Adult') tags.push('Adult', 'Settled');
  
  // 6. Size-Based Tags
  if (params.petSize === 'SMALL') tags.push('Apartment Friendly', 'Lap Dog');
  if (params.petSize === 'LARGE' || params.petSize === 'X-LARGE') tags.push('Needs Yard', 'Active Buddy');
  
  // 7. Deduplicate
  tags = Array.from(new Set(tags));
  
  // 8. Determine structured fields
  const energyLevel = determineEnergyLevel(params.description, ageCategory, tags);
  const size = determineSize(params.description, params.breed, params.petSize);
  
  return {
    tags,
    energyLevel,
    size,
    ageCategory
  };
}
