import { Pet } from '@/lib/adapters/base';

// ==========================================
// USER PROFILE - Accumulated from conversation
// ==========================================
export interface UserProfile {
  // Basic preferences
  species?: 'dog' | 'cat' | 'either';
  preferredBreed?: string;
  preferredSize?: 'small' | 'medium' | 'large' | 'any';
  preferredAge?: 'puppy' | 'adult' | 'senior' | 'any';
  
  // Living situation
  housing?: 'apartment' | 'house' | 'yard';
  hasKids?: boolean;
  hasOtherPets?: boolean;
  otherPetTypes?: string[];
  
  // Lifestyle
  energyLevel?: 'active' | 'moderate' | 'relaxed';
  workSchedule?: 'home' | 'office' | 'hybrid';
  experience?: 'first-time' | 'experienced';
  
  // Special considerations
  wantsSenior?: boolean;
  wantsSpecialNeeds?: boolean;
}

// ==========================================
// CONVERSATION STATE MANAGEMENT
// Tracks multi-turn conversation with the Pet Concierge
// ==========================================
export interface ConversationState {
  stage: 'greeting' | 'species' | 'lifestyle' | 'living' | 'preferences' | 'matching' | 'followup';
  profile: UserProfile;
  messageHistory: Array<{ role: 'user' | 'bot'; text: string }>;
  matchedPetIds: string[];
  isQuickMatch?: boolean;
}

export function createInitialState(): ConversationState {
  return {
    stage: 'greeting',
    profile: {},
    messageHistory: [],
    matchedPetIds: [],
  };
}

// ==========================================
// QUESTION TEMPLATES (FREE - No AI needed)
// ==========================================
const TEMPLATES = {
  greeting: "Hey there! 👋 I'm your Pet Concierge and I'm excited to help you find your perfect companion!\n\nAre you looking for a **dog** 🐕 or a **cat** 🐱?\n\n_(Or type \"surprise me\" for a quick match!)_",
  
  species_dog: "Awesome choice! 🐕 Dogs make the best adventure buddies!\n\nHow would you describe your lifestyle?\n• **Active** - I love hiking, running, outdoor adventures\n• **Relaxed** - I prefer cozy evenings and chill walks\n• **Family-focused** - I have kids and want a family dog",
  
  species_cat: "Great choice! 🐱 Cats are wonderful companions!\n\nWhat kind of energy are you looking for?\n• **Playful** - An active cat who loves to play\n• **Calm** - A chill lap cat for cozy times\n• **Independent** - A cat who's happy doing their own thing",
  
  living: "Got it! 🏠 Tell me about your living situation:\n• Do you live in an **apartment** or a **house with a yard**?\n• Any **kids** or **other pets** at home?",
  
  preferences: "Almost there! 🎯 Any preferences on:\n• **Size** (small, medium, large)?\n• **Age** (puppy/kitten, adult, senior)?\n• Or are you **open to anyone** who fits your lifestyle?",
  
  quick_match: "🎲 **Quick Match activated!** Let me pick some amazing pets for you...",
  
  no_pets: "😿 I couldn't find an exact match right now, but check back soon - new pets arrive daily! Would you like to **broaden your search** or **start over**?",
  
  error: "Oops! Something went wrong on my end. Here are some wonderful pets looking for homes - click any to learn more! 🐾",
};

// Check what profile fields are still needed
function getMissingProfileFields(profile: UserProfile): string[] {
  const missing: string[] = [];
  if (!profile.species) missing.push('species');
  if (!profile.energyLevel) missing.push('energy');
  if (profile.housing === undefined) missing.push('housing');
  return missing;
}

// Determine next question based on profile
function getNextQuestion(profile: UserProfile): { stage: ConversationState['stage']; question: string } | null {
  if (!profile.species) {
    return { stage: 'species', question: TEMPLATES.greeting };
  }
  if (!profile.energyLevel) {
    return { 
      stage: 'lifestyle', 
      question: profile.species === 'dog' ? TEMPLATES.species_dog : TEMPLATES.species_cat 
    };
  }
  if (profile.housing === undefined && profile.hasKids === undefined) {
    return { stage: 'living', question: TEMPLATES.living };
  }
  // Ready to match!
  return null;
}

// Tags to exclude from personality descriptions (factual, not personality)
const EXCLUDED_TAGS = [
  'Dog', 'Cat', 'Adult', 'Young', 'Senior', 'Small', 'Medium', 'Large', 'Extra Large',
  'Puppy/Kitten', 'Baby', 'Tabby', 'Calico', 'Tortoiseshell', 'Tuxedo', 'Brindle', 'Merle'
];

// Helper: Format breed to title case (e.g., "DOMESTIC SH" -> "Domestic Shorthair")
function formatBreed(breed: string): string {
  // Common breed abbreviation expansions
  const expansions: Record<string, string> = {
    'DOMESTIC SH': 'Domestic Shorthair',
    'DOMESTIC MH': 'Domestic Medium Hair',
    'DOMESTIC LH': 'Domestic Longhair',
    'DSH': 'Domestic Shorthair',
    'DMH': 'Domestic Medium Hair',
    'DLH': 'Domestic Longhair',
    'GSD': 'German Shepherd',
    'LAB': 'Labrador',
    'PIT': 'Pitbull Mix',
    'STAFF': 'Staffordshire Mix',
  };

  // Check for exact matches first
  const upperBreed = breed.toUpperCase().trim();
  if (expansions[upperBreed]) {
    return expansions[upperBreed];
  }

  // Check for partial matches
  for (const [abbrev, full] of Object.entries(expansions)) {
    if (upperBreed.includes(abbrev)) {
      return upperBreed.replace(abbrev, full).toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  // Default: title case the breed
  return breed.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/Mix$/i, 'Mix'); // Ensure "Mix" is capitalized
}

// ==========================================
// 1. BIO GENERATOR (Creative Writer - First Person)
// Used by: Admin Intake Form & Repository enrichment
// Writes from the pet's perspective in a friendly, natural voice
// 
// IMPORTANT: When isSyntheticDescription is true (no real shelter description),
// we generate an honest bio that invites people to visit, not fake personality traits.
// ==========================================
export async function generatePetBio(
  name: string, 
  breed: string, 
  tags: string[],
  options?: {
    isSyntheticDescription?: boolean;
    originalDescription?: string;
  }
): Promise<string> {
  // No delay needed - this is fast template-based generation
  const formattedBreed = formatBreed(breed);

  // Filter out generic/factual tags, keep only personality-related ones
  const personalityTags = tags.filter(tag => !EXCLUDED_TAGS.includes(tag));

  // Check if we have REAL personality data
  const hasRealPersonality = personalityTags.length > 0 && !options?.isSyntheticDescription;

  // If no real personality data (synthetic description or no traits extracted)
  // Generate an HONEST bio that invites people to visit
  if (!hasRealPersonality) {
    const honestBios = [
      `Hi, I'm ${name}! I'm a ${formattedBreed} waiting to meet my perfect match. Every pet has their own unique personality - come visit me at the shelter to discover mine!`,
      `Hello! My name is ${name} and I'm a ${formattedBreed}. I can't wait to show you who I really am - schedule a visit and let's get to know each other!`,
      `Hey there, I'm ${name}! I'm a ${formattedBreed} with my own special story to tell. Come meet me in person and I'll show you what makes me, me!`,
      `Hi, I'm ${name}, a ${formattedBreed} looking for my forever family. The best way to get to know me is to visit - I promise I'll make a great first impression!`,
      `I'm ${name}, a ${formattedBreed} ready for a new adventure! Want to know if we're a match? Come say hello and let's find out together!`,
    ];
    return honestBios[Math.floor(Math.random() * honestBios.length)];
  }

  // We have REAL personality traits from the description!
  // Join personality tags naturally (e.g., "playful, smart, and friendly")
  const traits = personalityTags
    .slice(0, 4) // Limit to 4 traits for readability
    .map(t => t.toLowerCase())
    .join(', ')
    .replace(/, ([^,]*)$/, ', and $1'); // Oxford comma style

  // Dynamic Templates (First Person, warm and friendly)
  const templates = [
    `Hi, I'm ${name}! I'm a ${formattedBreed} and everyone here says I'm ${traits}. I'm looking for someone special to share my days with - could that be you?`,
    `Hey there, I'm ${name}! As a ${formattedBreed}, I bring a lot of personality to the table. My friends describe me as ${traits}. I'd love to meet you!`,
    `Hello, future best friend! I'm ${name}, a ${formattedBreed} with a heart full of love. I'm ${traits}, and I think we'd make a great team!`,
    `What's up? I'm ${name}! I'm a ${formattedBreed} who's ${traits}. Life with me is never boring - come see for yourself!`,
    `Hi! My name is ${name} and I'm a ${formattedBreed}. The shelter staff says I'm ${traits}. I'm ready for my next adventure - want to join me?`,
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
// 3. PROFILE EXTRACTION (Heuristic - FREE)
// Extracts user preferences from natural language
// ==========================================
function extractProfileFromMessage(message: string, currentProfile: UserProfile): UserProfile {
  const lower = message.toLowerCase();
  const updates: Partial<UserProfile> = {};

  // Species detection
  if (lower.includes('dog') || lower.includes('pup') || lower.includes('puppy')) {
    updates.species = 'dog';
  } else if (lower.includes('cat') || lower.includes('kitten') || lower.includes('kitty')) {
    updates.species = 'cat';
  } else if (lower.includes('either') || lower.includes('both') || lower.includes('any')) {
    updates.species = 'either';
  }

  // Energy/Lifestyle detection
  if (lower.includes('active') || lower.includes('hik') || lower.includes('run') || lower.includes('jog') || lower.includes('adventure') || lower.includes('energetic')) {
    updates.energyLevel = 'active';
  } else if (lower.includes('chill') || lower.includes('relax') || lower.includes('calm') || lower.includes('couch') || lower.includes('lazy') || lower.includes('quiet')) {
    updates.energyLevel = 'relaxed';
  } else if (lower.includes('family') || lower.includes('kid') || lower.includes('child') || lower.includes('moderate')) {
    updates.energyLevel = 'moderate';
    if (lower.includes('kid') || lower.includes('child') || lower.includes('family')) {
      updates.hasKids = true;
    }
  }

  // Playful cats
  if (lower.includes('playful') && currentProfile.species === 'cat') {
    updates.energyLevel = 'active';
  }
  if (lower.includes('lap cat') || lower.includes('lap kitty')) {
    updates.energyLevel = 'relaxed';
  }

  // Housing detection
  if (lower.includes('apartment') || lower.includes('condo') || lower.includes('flat') || lower.includes('small space')) {
    updates.housing = 'apartment';
  } else if (lower.includes('house') || lower.includes('yard') || lower.includes('backyard') || lower.includes('garden')) {
    updates.housing = 'yard';
  }

  // Kids detection
  if (lower.includes('kid') || lower.includes('child') || lower.includes('toddler') || lower.includes('baby') || lower.includes('young ones')) {
    updates.hasKids = true;
  } else if (lower.includes('no kid') || lower.includes('no child') || lower.includes('just me') || lower.includes('single') || lower.includes('couple')) {
    updates.hasKids = false;
  }

  // Other pets detection
  if (lower.includes('other pet') || lower.includes('already have') || lower.includes('have a dog') || lower.includes('have a cat')) {
    updates.hasOtherPets = true;
    if (lower.includes('have a dog')) updates.otherPetTypes = ['dog'];
    if (lower.includes('have a cat')) updates.otherPetTypes = ['cat'];
  } else if (lower.includes('no other pet') || lower.includes('no pet') || lower.includes('first pet')) {
    updates.hasOtherPets = false;
    updates.experience = 'first-time';
  }

  // Size preferences
  if (lower.includes('small') || lower.includes('tiny') || lower.includes('little')) {
    updates.preferredSize = 'small';
  } else if (lower.includes('medium') || lower.includes('mid-size')) {
    updates.preferredSize = 'medium';
  } else if (lower.includes('large') || lower.includes('big')) {
    updates.preferredSize = 'large';
  } else if (lower.includes('any size') || lower.includes('open to')) {
    updates.preferredSize = 'any';
  }

  // Age preferences
  if (lower.includes('puppy') || lower.includes('kitten') || lower.includes('young') || lower.includes('baby')) {
    updates.preferredAge = 'puppy';
  } else if (lower.includes('senior') || lower.includes('older') || lower.includes('mature') || lower.includes('golden years')) {
    updates.preferredAge = 'senior';
    updates.wantsSenior = true;
  } else if (lower.includes('adult')) {
    updates.preferredAge = 'adult';
  }

  // Work schedule
  if (lower.includes('work from home') || lower.includes('wfh') || lower.includes('remote') || lower.includes('home all day')) {
    updates.workSchedule = 'home';
  } else if (lower.includes('office') || lower.includes('work outside') || lower.includes('9 to 5') || lower.includes('commute')) {
    updates.workSchedule = 'office';
  }

  return { ...currentProfile, ...updates };
}

// ==========================================
// 4. PET FILTERING (Based on Profile - FREE)
// ==========================================
function filterPetsByProfile(pets: Pet[], profile: UserProfile): Pet[] {
  let filtered = [...pets];

  // Species filter - now uses the explicit species field
  if (profile.species === 'dog') {
    filtered = filtered.filter(p => p.species === 'Dog');
  } else if (profile.species === 'cat') {
    filtered = filtered.filter(p => p.species === 'Cat');
  }

  // Energy filter
  if (profile.energyLevel === 'active') {
    // Prefer high energy but don't exclude all
    filtered = filtered.sort((a, b) => {
      const aActive = a.tags.some(t => ['High Energy', 'Playful', 'Active'].includes(t)) ? 1 : 0;
      const bActive = b.tags.some(t => ['High Energy', 'Playful', 'Active'].includes(t)) ? 1 : 0;
      return bActive - aActive;
    });
  } else if (profile.energyLevel === 'relaxed') {
    filtered = filtered.sort((a, b) => {
      const aChill = a.tags.some(t => ['Chill', 'Calm', 'Relaxed', 'Senior'].includes(t)) ? 1 : 0;
      const bChill = b.tags.some(t => ['Chill', 'Calm', 'Relaxed', 'Senior'].includes(t)) ? 1 : 0;
      return bChill - aChill;
    });
  }

  // Size filter for apartments
  if (profile.housing === 'apartment') {
    filtered = filtered.filter(p => 
      p.size === 'Small' || p.size === 'Medium' || p.tags.includes('Cat')
    );
  }

  // Kids compatibility
  if (profile.hasKids === true) {
    // Prioritize kid-friendly pets
    filtered = filtered.sort((a, b) => {
      const aKids = a.compatibility?.kids === true || a.tags.includes('Good with Kids') ? 1 : 0;
      const bKids = b.compatibility?.kids === true || b.tags.includes('Good with Kids') ? 1 : 0;
      return bKids - aKids;
    });
  }

  // Other pets compatibility
  if (profile.hasOtherPets === true) {
    filtered = filtered.filter(p => 
      p.compatibility?.dogs !== false && p.compatibility?.cats !== false
    );
  }

  // Size preference
  if (profile.preferredSize && profile.preferredSize !== 'any') {
    const sizeMap: Record<string, string[]> = {
      'small': ['Small'],
      'medium': ['Medium'],
      'large': ['Large', 'Extra Large'],
    };
    const targetSizes = sizeMap[profile.preferredSize] || [];
    if (targetSizes.length > 0) {
      filtered = filtered.sort((a, b) => {
        const aMatch = targetSizes.includes(a.size || '') ? 1 : 0;
        const bMatch = targetSizes.includes(b.size || '') ? 1 : 0;
        return bMatch - aMatch;
      });
    }
  }

  // Age preference
  if (profile.preferredAge === 'puppy') {
    filtered = filtered.sort((a, b) => {
      const aYoung = a.tags.some(t => ['Puppy/Kitten', 'Baby', 'Young'].includes(t)) ? 1 : 0;
      const bYoung = b.tags.some(t => ['Puppy/Kitten', 'Baby', 'Young'].includes(t)) ? 1 : 0;
      return bYoung - aYoung;
    });
  } else if (profile.preferredAge === 'senior' || profile.wantsSenior) {
    filtered = filtered.sort((a, b) => {
      const aSenior = a.tags.includes('Senior') ? 1 : 0;
      const bSenior = b.tags.includes('Senior') ? 1 : 0;
      return bSenior - aSenior;
    });
  }

  return filtered;
}

// ==========================================
// 5. MATCHMAKER (Smart Conversation Flow)
// Uses templates for questions, Gemini for explanations
// ==========================================
export interface MatchResult {
  text: string;
  pets: Pet[];
  state: ConversationState;
}

export async function findMatch(
  query: string, 
  allPets: Pet[], 
  state?: ConversationState
): Promise<MatchResult> {
  const currentState = state ? { ...state, profile: { ...state.profile } } : createInitialState();
  const lowerQuery = query.toLowerCase();

  // Add user message to history (keep last 5)
  currentState.messageHistory.push({ role: 'user', text: query });
  if (currentState.messageHistory.length > 10) {
    currentState.messageHistory = currentState.messageHistory.slice(-10);
  }

  // --- Handle Reset/Start Over ---
  if (lowerQuery.includes('start over') || lowerQuery.includes('reset') || lowerQuery.includes('new search')) {
    const freshState = createInitialState();
    const response = TEMPLATES.greeting;
    freshState.messageHistory.push({ role: 'bot', text: response });
    return { text: response, pets: [], state: freshState };
  }

  // --- Handle Quick Match / Surprise Me ---
  if (lowerQuery.includes('surprise') || lowerQuery.includes('quick') || lowerQuery.includes('random') || lowerQuery.includes('just show')) {
    currentState.isQuickMatch = true;
    currentState.stage = 'matching';
    
    // Get random mix of pets
    const shuffled = [...allPets].sort(() => Math.random() - 0.5);
    const quickPets = shuffled.slice(0, 5);
    
    currentState.matchedPetIds = quickPets.map(p => p.id);
    
    const response = "🎲 **Surprise picks!** Here are 5 amazing pets looking for love:\n\nClick any to learn more, or tell me about yourself and I'll find even better matches!";
    currentState.messageHistory.push({ role: 'bot', text: response });
    currentState.stage = 'followup';
    
    return { text: response, pets: quickPets, state: currentState };
  }

  // --- Extract profile updates from message ---
  currentState.profile = extractProfileFromMessage(query, currentState.profile);

  // --- Determine next step based on profile completeness ---
  const nextQ = getNextQuestion(currentState.profile);

  if (nextQ && currentState.stage !== 'followup') {
    // Still gathering info
    currentState.stage = nextQ.stage;
    currentState.messageHistory.push({ role: 'bot', text: nextQ.question });
    return { text: nextQ.question, pets: [], state: currentState };
  }

  // --- Ready to match! ---
  currentState.stage = 'matching';
  
  // Filter pets by profile
  const filtered = filterPetsByProfile(allPets, currentState.profile);
  const topMatches = filtered.slice(0, 5);
  
  currentState.matchedPetIds = topMatches.map(p => p.id);
  currentState.stage = 'followup';

  if (topMatches.length === 0) {
    // No matches - suggest broadening
    const fallbackPets = allPets.slice(0, 3);
    const response = TEMPLATES.no_pets;
    currentState.messageHistory.push({ role: 'bot', text: response });
    return { text: response, pets: fallbackPets, state: currentState };
  }

  // Generate personalized response
  const profile = currentState.profile;
  const petNames = topMatches.slice(0, 3).map(p => `**${p.name}**`).join(', ');
  
  let response = `🎉 Great news! Based on what you've told me, I found ${filtered.length} potential matches!\n\n`;
  
  // Add personalization based on profile
  const traits: string[] = [];
  if (profile.energyLevel === 'active') traits.push('active lifestyle');
  if (profile.energyLevel === 'relaxed') traits.push('relaxed vibe');
  if (profile.housing === 'apartment') traits.push('apartment living');
  if (profile.hasKids) traits.push('family with kids');
  if (profile.preferredSize) traits.push(`${profile.preferredSize}-sized pets`);
  
  if (traits.length > 0) {
    response += `Looking for: ${traits.join(', ')}\n\n`;
  }
  
  response += `Here are your top matches - ${petNames} and more! 👇\n\n`;
  response += `_Click any pet to see their full profile, or tell me more to refine your search!_`;

  currentState.messageHistory.push({ role: 'bot', text: response });
  return { text: response, pets: topMatches, state: currentState };
}