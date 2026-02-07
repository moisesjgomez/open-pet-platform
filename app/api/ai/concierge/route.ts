// app/api/ai/concierge/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PetRepository } from '@/lib/repository';
import { findMatch, ConversationState, createInitialState } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationState } = body as {
      message: string;
      conversationState?: ConversationState;
    };

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Use provided state or create initial state
    const state = conversationState || createInitialState();

    // Fetch real pets from repository
    const repo = new PetRepository();
    const allPets = await repo.getSmartPets();

    // Call AI matching service
    const response = await findMatch(message, allPets, state);

    return NextResponse.json({
      reply: response.text,
      pets: response.pets,
      newState: response.state,
    });
  } catch (error) {
    console.error('Concierge error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        reply: 'Sorry, I had a little hiccup! Please try again.',
        pets: [],
        newState: createInitialState(),
      },
      { status: 500 }
    );
  }
}
