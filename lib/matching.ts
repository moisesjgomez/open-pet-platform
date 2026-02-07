import { Pet } from './adapters/base';

export interface UserPreferences {
  energyLevel: 'Low' | 'Moderate' | 'High';
  size: ('Small' | 'Medium' | 'Large' | 'Extra Large')[];
  hasKids: boolean;
  hasDogs: boolean;
  hasCats: boolean;
}

export function calculateMatchScore(pet: Pet, prefs: UserPreferences): number {
  let score = 0;

  // 1. HARD FILTERS (Dealbreakers)
  // If the user has specific household members, the pet MUST be compatible.
  if (prefs.hasKids && !pet.compatibility?.kids) return 0;
  if (prefs.hasDogs && !pet.compatibility?.dogs) return 0;
  if (prefs.hasCats && !pet.compatibility?.cats) return 0;

  // If we passed the hard filters, we start with a base score
  score += 50;

  // 2. ENERGY LEVEL MATCHING (Weighted)
  const energyLevels = ['Low', 'Moderate', 'High'];
  const petEnergyIndex = energyLevels.indexOf(pet.energyLevel || 'Moderate');
  const userEnergyIndex = energyLevels.indexOf(prefs.energyLevel);
  const energyDiff = Math.abs(petEnergyIndex - userEnergyIndex);

  if (energyDiff === 0) {
    score += 30; // Perfect match
  } else if (energyDiff === 1) {
    score += 15; // Close enough
  } else {
    score -= 10; // Mismatch (e.g. Low vs High)
  }

  // 3. SIZE MATCHING
  if (pet.size && prefs.size.includes(pet.size)) {
    score += 20;
  } else {
    // If not an exact size match, check if it's adjacent? 
    // For now, let's just give 0 bonus, or maybe a small penalty.
    // Let's keep it simple: Bonus for match.
  }

  // 4. BONUS POINTS
  // Lower days in shelter might need more love? Or higher days?
  // Let's prioritize "Long Stay" pets to help them get adopted?
  // Or maybe just random "Vibe Check" points (simulated by tags).
  
  return Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
}
