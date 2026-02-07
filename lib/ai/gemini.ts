/**
 * Google Gemini AI Client with Cost Controls
 * 
 * Features:
 * - Rate limiting (max requests per hour)
 * - Token budget tracking
 * - Model selection (Gemini 1.5 Flash for routine tasks, Gemini 1.5 Pro for complex reasoning)
 * - Graceful fallback to heuristics when budget exceeded or API unavailable
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { prisma, isDatabaseAvailable } from '@/lib/db';

// Model pricing (per 1K tokens as of 2024 - Gemini is significantly cheaper than OpenAI)
const MODEL_PRICING = {
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },    // $0.075/1M input, $0.30/1M output
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },        // $1.25/1M input, $5/1M output
  'text-embedding-004': { input: 0.00001, output: 0 },         // Free tier available, then $0.01/1M
};

// Configuration from environment
const config = {
  apiKey: process.env.GEMINI_API_KEY,
  dailyBudgetUsd: parseFloat(process.env.AI_DAILY_BUDGET_USD || '1.00'),
  requestsPerHour: parseInt(process.env.AI_REQUESTS_PER_HOUR || '100', 10),
  fallbackToHeuristics: process.env.AI_FALLBACK_TO_HEURISTICS !== 'false',
};

// In-memory rate limiting (resets on server restart)
let requestsThisHour = 0;
let hourStart = Date.now();

// Singleton Gemini client
let geminiClient: GoogleGenerativeAI | null = null;

/**
 * Get the Gemini client instance
 * Returns null if API key is not configured
 */
export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!config.apiKey) {
    console.warn('Gemini API key not configured');
    return null;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(config.apiKey);
  }

  return geminiClient;
}

/**
 * Get a specific model instance
 */
export function getModel(modelName: string = 'gemini-1.5-flash'): GenerativeModel | null {
  const client = getGeminiClient();
  if (!client) return null;
  
  return client.getGenerativeModel({ model: modelName });
}

/**
 * Check if we're within rate limits
 */
function checkRateLimit(): boolean {
  const now = Date.now();
  
  // Reset counter every hour
  if (now - hourStart > 60 * 60 * 1000) {
    requestsThisHour = 0;
    hourStart = now;
  }

  return requestsThisHour < config.requestsPerHour;
}

/**
 * Track API usage in the database
 */
async function trackUsage(
  model: string,
  tokensUsed: number
): Promise<void> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) return;

  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
  const estimatedCost = pricing
    ? (tokensUsed / 1000) * (pricing.input + pricing.output) / 2
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    await prisma.aIUsage.upsert({
      where: {
        date_model: {
          date: today,
          model,
        },
      },
      update: {
        requestCount: { increment: 1 },
        tokensUsed: { increment: tokensUsed },
        estimatedCost: { increment: estimatedCost },
      },
      create: {
        date: today,
        model,
        requestCount: 1,
        tokensUsed,
        estimatedCost,
      },
    });
  } catch (error) {
    console.error('Usage tracking error:', error);
  }
}

/**
 * Check if we're within daily budget
 */
async function checkBudget(): Promise<boolean> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    // If DB unavailable, allow requests but rely on rate limiting
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const usage = await prisma.aIUsage.aggregate({
      where: {
        date: today,
      },
      _sum: {
        estimatedCost: true,
      },
    });

    const todayCost = usage._sum.estimatedCost || 0;
    return todayCost < config.dailyBudgetUsd;
  } catch {
    return true; // Allow if we can't check
  }
}

/**
 * Check if Gemini is available and within limits
 */
export async function isGeminiAvailable(): Promise<boolean> {
  if (!config.apiKey) return false;
  if (!checkRateLimit()) return false;
  if (!(await checkBudget())) return false;
  return true;
}

/**
 * Should we fallback to heuristics?
 */
export function shouldFallback(): boolean {
  return config.fallbackToHeuristics && !config.apiKey;
}

export type ChatModel = 'gemini-1.5-flash' | 'gemini-1.5-pro';

interface ChatOptions {
  model?: ChatModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Send a chat completion request with cost controls
 */
export async function chat(
  userMessage: string,
  options: ChatOptions = {}
): Promise<{ text: string; tokensUsed: number } | null> {
  const modelName = options.model || 'gemini-1.5-flash';
  const model = getModel(modelName);
  if (!model) return null;

  if (!checkRateLimit()) {
    console.warn('Rate limit exceeded, falling back to heuristics');
    return null;
  }

  if (!(await checkBudget())) {
    console.warn('Daily budget exceeded, falling back to heuristics');
    return null;
  }

  try {
    requestsThisHour++;

    // Build the prompt with system context if provided
    let fullPrompt = userMessage;
    if (options.systemPrompt) {
      fullPrompt = `${options.systemPrompt}\n\nUser request: ${userMessage}`;
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 500,
      },
    });

    const response = result.response;
    const text = response.text();
    
    // Estimate tokens (Gemini doesn't always return exact counts)
    const tokensUsed = Math.ceil((fullPrompt.length + text.length) / 4);

    // Track usage
    await trackUsage(modelName, tokensUsed);

    return { text, tokensUsed };
  } catch (error) {
    console.error('Gemini chat error:', error);
    return null;
  }
}

/**
 * Generate embeddings using Gemini's embedding model
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = getGeminiClient();
  if (!client) return null;

  if (!(await isGeminiAvailable())) {
    return null;
  }

  try {
    requestsThisHour++;
    
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    
    const embedding = result.embedding.values;
    
    // Track usage
    const tokensUsed = Math.ceil(text.length / 4);
    await trackUsage('text-embedding-004', tokensUsed);
    
    return embedding;
  } catch (error) {
    console.error('Gemini embedding error:', error);
    return null;
  }
}

/**
 * Generate pet bio using AI with fallback to templates
 * Bios are written in FIRST PERSON from the pet's perspective
 */
export async function generatePetBioAI(
  name: string,
  breed: string,
  tags: string[],
  description?: string
): Promise<{ bio: string; tokensUsed: number; fromAI: boolean }> {
  // Try AI first
  const systemPrompt = `You are a creative writer for an animal shelter. Write engaging, heartwarming pet adoption bios IN FIRST PERSON from the pet's perspective (e.g., "Hi, I'm Pickle! I love..."). Keep bios under 100 words. Be warm, playful, and encourage adoption. The pet should sound friendly and endearing.`;

  const userPrompt = `Write a first-person adoption bio for ${name}, a ${breed}. 
Tags: ${tags.join(', ')}
${description ? `Additional info: ${description}` : ''}
Write as if ${name} is introducing themselves. Start with "Hi, I'm ${name}!" or similar.`;

  const result = await chat(userPrompt, {
    model: 'gemini-1.5-flash',
    systemPrompt,
    temperature: 0.8,
    maxTokens: 200,
  });

  if (result) {
    return { bio: result.text, tokensUsed: result.tokensUsed, fromAI: true };
  }

  // Fallback to template-based generation (first person)
  const traits = tags.map(t => t.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1');
  
  const templates = [
    `Hi, I'm ${name}! I'm a ${breed} who loves being ${traits || 'the center of attention'}. I'm looking for my forever family - could that be you? Come meet me today!`,
    `Hey there! My name is ${name}, and I'm a ${breed}. ${traits ? `My friends say I'm ${traits}.` : ''} I can't wait to find my perfect human match!`,
    `Woof woof! (Or meow!) I'm ${name}, a lovable ${breed}. ${traits ? `I'm known for being ${traits}.` : ''} I'm ready to fill your home with love!`,
  ];

  return {
    bio: templates[Math.floor(Math.random() * templates.length)],
    tokensUsed: 0,
    fromAI: false,
  };
}

/**
 * Generate match explanation using AI with fallback
 */
export async function generateMatchExplanation(
  petName: string,
  petTraits: string[],
  userPreferences: string[],
  matchScore: number
): Promise<{ explanation: string; tokensUsed: number; fromAI: boolean }> {
  const systemPrompt = `You are a friendly pet matchmaker. Explain why a pet is a good match for an adopter in 2-3 short sentences. Be warm and encouraging but honest.`;

  const userPrompt = `Explain why ${petName} (traits: ${petTraits.join(', ')}) is a ${matchScore}% match for someone who prefers: ${userPreferences.join(', ')}. Keep it brief and friendly.`;

  const result = await chat(userPrompt, {
    model: 'gemini-1.5-flash',
    systemPrompt,
    temperature: 0.7,
    maxTokens: 100,
  });

  if (result) {
    return { explanation: result.text, tokensUsed: result.tokensUsed, fromAI: true };
  }

  // Fallback
  const matchingTraits = petTraits.filter(t => 
    userPreferences.some(p => p.toLowerCase().includes(t.toLowerCase()))
  );

  let explanation = `${petName} is a ${matchScore}% match for you!`;
  if (matchingTraits.length > 0) {
    explanation += ` They're ${matchingTraits.slice(0, 2).join(' and ')}, just like you prefer.`;
  }

  return { explanation, tokensUsed: 0, fromAI: false };
}

/**
 * Analyze pet images using Gemini Vision
 * Analyzes up to 5 photos to extract personality traits and behavioral cues
 */
export async function analyzePetImage(
  imageUrlOrUrls: string | string[]
): Promise<{ 
  breed?: string; 
  color?: string; 
  temperament?: string[]; 
  description?: string;
  tokensUsed: number;
  fromAI: boolean;
} | null> {
  const model = getModel('gemini-1.5-flash');
  if (!model) return null;

  if (!(await isGeminiAvailable())) {
    return null;
  }

  // Convert to array and limit to 5 images
  const imageUrls = Array.isArray(imageUrlOrUrls) 
    ? imageUrlOrUrls.slice(0, 5) 
    : [imageUrlOrUrls];

  if (imageUrls.length === 0) return null;

  try {
    requestsThisHour++;

    // Fetch all images and convert to base64
    const imageParts = await Promise.all(
      imageUrls.map(async (url) => {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          return {
            inlineData: {
              mimeType,
              data: base64,
            },
          };
        } catch {
          return null;
        }
      })
    );

    // Filter out failed image fetches (type assertion needed for TypeScript)
    const validImageParts = imageParts.filter((part): part is { inlineData: { mimeType: string; data: string } } => part !== null);
    if (validImageParts.length === 0) return null;

    const photoCount = validImageParts.length;
    const prompt = photoCount === 1
      ? `Analyze this pet photo and provide:
1. Likely breed or breed mix
2. Primary colors
3. Observable behavioral/temperament cues (e.g., "relaxed posture", "alert expression", "playful stance", "calm demeanor")
4. A brief 1-sentence description

IMPORTANT: Only describe traits you can ACTUALLY observe in the photo. Do not make assumptions.

Respond in JSON format:
{
  "breed": "breed name",
  "color": "color description", 
  "temperament": ["observed trait 1", "observed trait 2"],
  "description": "brief description"
}`
      : `Analyze these ${photoCount} photos of the same pet and provide:
1. Likely breed or breed mix
2. Primary colors
3. Observable behavioral/temperament cues based on what you see across all photos (e.g., "relaxed in most photos", "alert expression", "playful posture", "comfortable with camera")
4. A brief 1-sentence description summarizing this pet

IMPORTANT: Only describe traits you can ACTUALLY observe in the photos. Do not assume personality from breed.

Respond in JSON format:
{
  "breed": "breed name",
  "color": "color description",
  "temperament": ["observed trait 1", "observed trait 2", "observed trait 3"],
  "description": "brief description based on visual observation"
}`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          ...validImageParts,
          { text: prompt },
        ],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      },
    });

    const text = result.response.text();
    // Account for image tokens (~250 tokens per image for vision models)
    const tokensUsed = Math.ceil(text.length / 4) + (250 * validImageParts.length);

    await trackUsage('gemini-1.5-flash', tokensUsed);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        breed: parsed.breed,
        color: parsed.color,
        temperament: parsed.temperament,
        description: parsed.description,
        tokensUsed,
        fromAI: true,
      };
    }

    return null;
  } catch (error) {
    console.error('Gemini vision error:', error);
    return null;
  }
}

/**
 * Get usage statistics for the current day
 */
export async function getDailyUsageStats(): Promise<{
  totalRequests: number;
  totalTokens: number;
  estimatedCost: number;
  budgetRemaining: number;
} | null> {
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const usage = await prisma.aIUsage.aggregate({
      where: { date: today },
      _sum: {
        requestCount: true,
        tokensUsed: true,
        estimatedCost: true,
      },
    });

    const totalCost = usage._sum.estimatedCost || 0;

    return {
      totalRequests: usage._sum.requestCount || 0,
      totalTokens: usage._sum.tokensUsed || 0,
      estimatedCost: totalCost,
      budgetRemaining: Math.max(0, config.dailyBudgetUsd - totalCost),
    };
  } catch {
    return null;
  }
}
