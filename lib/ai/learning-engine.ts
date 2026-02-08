/**
 * AI Learning Engine
 * Tracks user preferences based on swipe behavior and generates personalized recommendations
 */

import { Pet } from '../adapters/base';

// The User's "AI Profile" - A weighted bag of preferences
export interface UserAIProfile {
  tagWeights: Record<string, number>; // e.g., { "High Energy": 5, "Cat": -10 }
  breedWeights: Record<string, number>; // e.g., { "Labrador": 3, "Siamese": -2 }
  sizeWeights: Record<string, number>; // e.g., { "Small": 2, "Large": -1 }
  energyWeights: Record<string, number>; // e.g., { "High": 3, "Low": -5 }
  likedPetIds: string[]; // IDs of pets the user swiped RIGHT on
  dislikedPetIds: string[]; // IDs of pets the user swiped LEFT on
  totalInteractions: number; // Total swipes
}

// Default empty profile
export const DEFAULT_AI_PROFILE: UserAIProfile = {
  tagWeights: {},
  breedWeights: {},
  sizeWeights: {},
  energyWeights: {},
  likedPetIds: [],
  dislikedPetIds: [],
  totalInteractions: 0,
};

/**
 * SCORE A PET based on the user's AI profile
 * Higher score = better match
 */
export function scorePet(pet: Pet, profile: UserAIProfile): number {
  let score = 0;

  // 1. Tag Matching (Most Important)
  pet.tags.forEach(tag => {
    const weight = profile.tagWeights[tag] || 0;
    score += weight * 2; // Tags are 2x important
  });

  // 2. Breed Matching
  const breedWeight = profile.breedWeights[pet.breed] || 0;
  score += breedWeight;

  // 3. Size Matching
  if (pet.size) {
    const sizeWeight = profile.sizeWeights[pet.size] || 0;
    score += sizeWeight;
  }

  // 4. Energy Level Matching
  if (pet.energyLevel) {
    const energyWeight = profile.energyWeights[pet.energyLevel] || 0;
    score += energyWeight;
  }

  // 5. Penalty if already swiped on
  if (profile.likedPetIds.includes(pet.id)) {
    score -= 1000; // Don't show liked pets in recommendations
  }
  if (profile.dislikedPetIds.includes(pet.id)) {
    score -= 500; // Heavily penalize previously rejected pets
  }

  return score;
}

/**
 * UPDATE THE USER'S AI PROFILE based on a swipe action
 * @param profile Current AI profile
 * @param pet The pet that was swiped on
 * @param action 'like' or 'nope'
 * @returns Updated AI profile
 */
export function updatePreferences(
  profile: UserAIProfile,
  pet: Pet,
  action: 'like' | 'nope'
): UserAIProfile {
  const newProfile: UserAIProfile = {
    ...profile,
    tagWeights: { ...profile.tagWeights },
    breedWeights: { ...profile.breedWeights },
    sizeWeights: { ...profile.sizeWeights },
    energyWeights: { ...profile.energyWeights },
    likedPetIds: [...profile.likedPetIds],
    dislikedPetIds: [...profile.dislikedPetIds],
    totalInteractions: profile.totalInteractions + 1,
  };

  const multiplier = action === 'like' ? 1 : -0.3; // Likes boost, Nopes punish less

  // 1. Update Tag Weights
  pet.tags.forEach(tag => {
    const current = newProfile.tagWeights[tag] || 0;
    newProfile.tagWeights[tag] = current + (1 * multiplier);
  });

  // 2. Update Breed Weights
  const currentBreedWeight = newProfile.breedWeights[pet.breed] || 0;
  newProfile.breedWeights[pet.breed] = currentBreedWeight + (1 * multiplier);

  // 3. Update Size Weights
  if (pet.size) {
    const currentSizeWeight = newProfile.sizeWeights[pet.size] || 0;
    newProfile.sizeWeights[pet.size] = currentSizeWeight + (0.5 * multiplier);
  }

  // 4. Update Energy Weights
  if (pet.energyLevel) {
    const currentEnergyWeight = newProfile.energyWeights[pet.energyLevel] || 0;
    newProfile.energyWeights[pet.energyLevel] = currentEnergyWeight + (0.5 * multiplier);
  }

  // 5. Track Liked/Disliked IDs (for shortlist and filtering)
  if (action === 'like') {
    if (!newProfile.likedPetIds.includes(pet.id)) {
      newProfile.likedPetIds.push(pet.id);
    }
  } else {
    if (!newProfile.dislikedPetIds.includes(pet.id)) {
      newProfile.dislikedPetIds.push(pet.id);
    }
  }

  return newProfile;
}

/**
 * REMOVE A PET from the shortlist
 */
export function removeFromShortlist(profile: UserAIProfile, petId: string): UserAIProfile {
  return {
    ...profile,
    likedPetIds: profile.likedPetIds.filter(id => id !== petId),
  };
}

/**
 * UNDO A SWIPE - reverses the weight changes and removes from liked/disliked lists
 * @param profile Current AI profile
 * @param pet The pet that was swiped on
 * @param wasLike Whether the original swipe was a like (true) or nope (false)
 * @returns Updated AI profile with swipe reversed
 */
export function undoSwipe(
  profile: UserAIProfile,
  pet: Pet,
  wasLike: boolean
): UserAIProfile {
  const newProfile: UserAIProfile = {
    ...profile,
    tagWeights: { ...profile.tagWeights },
    breedWeights: { ...profile.breedWeights },
    sizeWeights: { ...profile.sizeWeights },
    energyWeights: { ...profile.energyWeights },
    likedPetIds: [...profile.likedPetIds],
    dislikedPetIds: [...profile.dislikedPetIds],
    totalInteractions: Math.max(0, profile.totalInteractions - 1),
  };

  // Reverse the multiplier that was applied
  const multiplier = wasLike ? -1 : 0.3; // Opposite of what updatePreferences does

  // 1. Reverse Tag Weights
  pet.tags.forEach(tag => {
    const current = newProfile.tagWeights[tag] || 0;
    newProfile.tagWeights[tag] = current + (1 * multiplier);
  });

  // 2. Reverse Breed Weights
  const currentBreedWeight = newProfile.breedWeights[pet.breed] || 0;
  newProfile.breedWeights[pet.breed] = currentBreedWeight + (1 * multiplier);

  // 3. Reverse Size Weights
  if (pet.size) {
    const currentSizeWeight = newProfile.sizeWeights[pet.size] || 0;
    newProfile.sizeWeights[pet.size] = currentSizeWeight + (0.5 * multiplier);
  }

  // 4. Reverse Energy Weights
  if (pet.energyLevel) {
    const currentEnergyWeight = newProfile.energyWeights[pet.energyLevel] || 0;
    newProfile.energyWeights[pet.energyLevel] = currentEnergyWeight + (0.5 * multiplier);
  }

  // 5. Remove from liked/disliked lists
  if (wasLike) {
    newProfile.likedPetIds = newProfile.likedPetIds.filter(id => id !== pet.id);
  } else {
    newProfile.dislikedPetIds = newProfile.dislikedPetIds.filter(id => id !== pet.id);
  }

  return newProfile;
}

/**
 * GET RECOMMENDED PETS sorted by AI score
 */
export function getRecommendedPets(allPets: Pet[], profile: UserAIProfile): Pet[] {
  // Score all pets
  const scoredPets = allPets.map(pet => ({
    pet,
    score: scorePet(pet, profile),
  }));

  // Sort by score (highest first)
  scoredPets.sort((a, b) => b.score - a.score);

  return scoredPets.map(sp => sp.pet);
}

/**
 * STORAGE HELPERS
 */
const STORAGE_KEY = 'ai_profile';

export function saveProfile(profile: UserAIProfile): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }
}

export function loadProfile(): UserAIProfile {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse AI profile', e);
      }
    }
  }
  return DEFAULT_AI_PROFILE;
}

export function clearProfile(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
