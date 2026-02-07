/**
 * AI Text Analysis Engine
 * Centralizes all heuristic logic for extracting personality traits, tags, and attributes
 * from raw pet data (descriptions, ages, etc.)
 * 
 * NOTE: We do NOT generate personality traits from breed stereotypes.
 * Only extract traits from actual shelter descriptions or AI image analysis.
 */

// ==========================================
// QUERY NORMALIZATION FOR CACHING
// Used by Pet Concierge to create consistent cache keys
// ==========================================

// Filler words to remove from queries
const FILLER_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'a', 'an', 'the', 'this', 'that', 'these', 'those',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'want', 'need', 'like', 'love', 'looking', 'searching', 'find', 'get',
  'for', 'to', 'of', 'in', 'on', 'at', 'with', 'from', 'by',
  'and', 'or', 'but', 'so', 'if', 'then', 'because',
  'very', 'really', 'just', 'also', 'too', 'some', 'any',
  'who', 'what', 'where', 'when', 'why', 'how',
  'please', 'thanks', 'thank', 'hi', 'hello', 'hey',
]);

// Word stemming/normalization mappings
const WORD_STEMS: Record<string, string> = {
  // Species
  'dogs': 'dog', 'puppy': 'dog', 'puppies': 'dog', 'pup': 'dog', 'pups': 'dog',
  'cats': 'cat', 'kitten': 'cat', 'kittens': 'cat', 'kitty': 'cat', 'kitties': 'cat',
  
  // Energy/Activity
  'hiking': 'hike', 'hiker': 'hike', 'hikes': 'hike',
  'running': 'run', 'runner': 'run', 'runs': 'run',
  'walking': 'walk', 'walks': 'walk', 'walker': 'walk',
  'active': 'active', 'activity': 'active', 'activities': 'active',
  'energetic': 'energy', 'energized': 'energy',
  'playful': 'play', 'playing': 'play', 'plays': 'play',
  'exercising': 'exercise', 'exercises': 'exercise',
  
  // Calm/Relaxed
  'relaxed': 'chill', 'relaxing': 'chill', 'relax': 'chill',
  'calm': 'chill', 'calming': 'chill',
  'lazy': 'chill', 'lazier': 'chill',
  'mellow': 'chill', 'easygoing': 'chill', 'easy-going': 'chill',
  'laid-back': 'chill', 'laidback': 'chill',
  'couch': 'chill', 'cuddly': 'cuddle', 'cuddling': 'cuddle',
  'quiet': 'chill', 'quieter': 'chill',
  
  // Family
  'kids': 'kid', 'children': 'kid', 'child': 'kid', 'toddler': 'kid', 'toddlers': 'kid',
  'family': 'family', 'families': 'family',
  
  // Living situation
  'apartments': 'apartment', 'condo': 'apartment', 'condos': 'apartment',
  'studio': 'apartment', 'flat': 'apartment',
  'house': 'yard', 'houses': 'yard', 'backyard': 'yard', 'yards': 'yard',
  
  // Size
  'small': 'small', 'smaller': 'small', 'tiny': 'small', 'little': 'small',
  'medium': 'medium', 'mid-sized': 'medium',
  'large': 'large', 'larger': 'large', 'big': 'large', 'bigger': 'large',
  
  // Age
  'senior': 'senior', 'seniors': 'senior', 'older': 'senior', 'elderly': 'senior',
  'young': 'young', 'younger': 'young',
  'adult': 'adult', 'adults': 'adult',
};

/**
 * Normalize a user query for consistent caching
 * - Lowercase
 * - Remove punctuation
 * - Remove filler words
 * - Stem common variations
 * - Return sorted unique keywords
 */
export function normalizeQuery(query: string): string {
  // Lowercase and remove punctuation
  const cleaned = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into words
  const words = cleaned.split(' ');
  
  // Process each word
  const keywords: string[] = [];
  for (const word of words) {
    // Skip filler words
    if (FILLER_WORDS.has(word)) continue;
    
    // Skip very short words
    if (word.length < 2) continue;
    
    // Apply stemming if available
    const stemmed = WORD_STEMS[word] || word;
    
    // Add if not already present
    if (!keywords.includes(stemmed)) {
      keywords.push(stemmed);
    }
  }
  
  // Sort for consistent cache keys
  return keywords.sort().join(' ');
}

/**
 * Generate a cache key from normalized query + conversation context
 */
export function generateConciergeCacheKey(
  normalizedQuery: string, 
  species?: 'dog' | 'cat',
  lifestyle?: 'active' | 'chill'
): string {
  const parts = [normalizedQuery];
  if (species) parts.push(`species:${species}`);
  if (lifestyle) parts.push(`lifestyle:${lifestyle}`);
  return parts.join('|');
}

// COLOR/PATTERN - Visual facts only, no personality assumptions
const COLOR_PATTERNS: Record<string, string> = {
  'TABBY': 'Tabby',
  'CALICO': 'Calico',
  'TORTIE': 'Tortoiseshell',
  'TUXEDO': 'Tuxedo',
  'BRINDLE': 'Brindle',
  'MERLE': 'Merle',
};

// DESCRIPTION KEYWORD ANALYSIS - Extract REAL personality from shelter notes
// Only match if the description actually says these things
const DESCRIPTION_KEYWORDS: Record<string, string[]> = {
  // Activity Level
  'run': ['Active'],
  'hike': ['Hiking Buddy'],
  'hiking': ['Hiking Buddy'],
  'active': ['Active'],
  'play': ['Playful'],
  'playful': ['Playful'],
  'energetic': ['High Energy'],
  'energy': ['High Energy'],
  'exercise': ['Needs Exercise'],
  
  // Calm/Relaxed
  'couch': ['Couch Potato'],
  'relax': ['Relaxed'],
  'calm': ['Calm'],
  'chill': ['Chill'],
  'nap': ['Loves Naps'],
  'lazy': ['Relaxed'],
  'mellow': ['Mellow'],
  'laid back': ['Laid Back'],
  'laid-back': ['Laid Back'],
  
  // Social/Family
  'kid': ['Good with Kids'],
  'kids': ['Good with Kids'],
  'children': ['Good with Kids'],
  'family': ['Family Friendly'],
  'gentle': ['Gentle'],
  'friendly': ['Friendly'],
  'social': ['Social'],
  'loves people': ['People Lover'],
  'loves everyone': ['Social Butterfly'],
  
  // Affection
  'cuddle': ['Cuddly'],
  'cuddly': ['Cuddly'],
  'snuggle': ['Snuggly'],
  'lap': ['Lap Pet'],
  'affectionate': ['Affectionate'],
  'loving': ['Loving'],
  'sweet': ['Sweet'],
  
  // Intelligence/Training
  'smart': ['Smart'],
  'clever': ['Clever'],
  'train': ['Trainable'],
  'trained': ['Trained'],
  'tricks': ['Knows Tricks'],
  'commands': ['Knows Commands'],
  'obedient': ['Well-Behaved'],
  
  // Communication
  'vocal': ['Vocal'],
  'talkative': ['Talkative'],
  'quiet': ['Quiet'],
  'bark': ['Vocal'],
  'meow': ['Vocal'],
  
  // Temperament
  'shy': ['Shy', 'Needs Patience'],
  'timid': ['Timid', 'Needs Patience'],
  'confident': ['Confident'],
  'bold': ['Bold'],
  'brave': ['Brave'],
  'independent': ['Independent'],
  'loyal': ['Loyal'],
  'protective': ['Protective'],
  'goofy': ['Goofy'],
  'silly': ['Silly'],
  
  // Special Traits
  'water': ['Water Lover'],
  'swim': ['Loves Swimming'],
  'fetch': ['Loves Fetch'],
  'ball': ['Ball Obsessed'],
  'toy': ['Loves Toys'],
  'treat': ['Food Motivated'],
  'food': ['Food Motivated'],
};

/**
 * Analyze breed name - Returns EMPTY array
 * We don't generate fake personality from breed stereotypes
 * @deprecated Kept for backwards compatibility, returns empty
 */
export function analyzeBreed(_breed: string): string[] {
  // Intentionally returns empty - no fake breed-based traits
  return [];
}

/**
 * Analyze color/pattern - Returns visual pattern name only, no personality
 */
export function analyzeColor(color: string): string[] {
  const upperColor = color.toUpperCase();
  const patterns: string[] = [];
  
  Object.entries(COLOR_PATTERNS).forEach(([key, patternName]) => {
    if (upperColor.includes(key)) {
      patterns.push(patternName);
    }
  });
  
  return patterns;
}

/**
 * Analyze description text for personality keywords
 * Only extracts traits that are ACTUALLY mentioned in the description
 */
export function analyzeDescription(description: string, isSynthetic: boolean = false): string[] {
  // Don't extract traits from synthetic descriptions - they have no real personality info
  if (isSynthetic) {
    return [];
  }

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
 * Only extracts REAL traits from descriptions, not stereotypes
 */
export function generateSmartTags(params: {
  breed: string;
  color?: string;
  description: string;
  age: string;
  animalType: string;
  petSize?: string;
  isSyntheticDescription?: boolean;
}): {
  tags: string[];
  energyLevel: 'Low' | 'Moderate' | 'High';
  size: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  ageCategory: 'Baby' | 'Young' | 'Adult' | 'Senior';
} {
  let tags: string[] = [];
  
  // 1. Animal Type (factual)
  if (params.animalType === 'DOG') tags.push('Dog');
  if (params.animalType === 'CAT') tags.push('Cat');
  
  // 2. Breed Analysis - DISABLED (returns empty, no stereotypes)
  // tags.push(...analyzeBreed(params.breed));
  
  // 3. Color/Pattern Analysis (visual facts only, no personality)
  if (params.color) {
    tags.push(...analyzeColor(params.color));
  }
  
  // 4. Description Analysis - ONLY if real description
  // Skip for synthetic descriptions (no real personality data)
  if (!params.isSyntheticDescription) {
    tags.push(...analyzeDescription(params.description, false));
  }
  
  // 5. Age Category (factual, no personality assumptions)
  const ageCategory = determineAgeCategory(params.age);
  // Only add factual age tags, not personality assumptions
  if (ageCategory === 'Baby') tags.push('Puppy/Kitten');
  if (ageCategory === 'Senior') tags.push('Senior');
  if (ageCategory === 'Young') tags.push('Young');
  if (ageCategory === 'Adult') tags.push('Adult');
  
  // 6. Size (factual)
  if (params.petSize === 'SMALL') tags.push('Small');
  if (params.petSize === 'MEDIUM') tags.push('Medium');
  if (params.petSize === 'LARGE') tags.push('Large');
  if (params.petSize === 'X-LARGE') tags.push('Extra Large');
  
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
