'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Home, PawPrint, Baby, Zap, Heart, Dog, Cat } from 'lucide-react';

export interface OnboardingData {
  livingSituation: string | null;
  experienceLevel: string | null;
  hasChildren: boolean | null;
  hasOtherPets: boolean | null;
  otherPetTypes: string | null;
  activityLevel: string | null;
  preferredSpecies: string | null;
}

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => void;
  onSkip: () => void;
}

const STEPS = [
  {
    id: 'living',
    title: 'Where do you live?',
    emoji: '🏠',
    subtitle: 'This helps us find pets that fit your space',
    options: [
      { value: 'apartment', label: 'Apartment', emoji: '🏢' },
      { value: 'house', label: 'House (no yard)', emoji: '🏡' },
      { value: 'house_yard', label: 'House with yard', emoji: '🌳' },
    ],
    field: 'livingSituation' as const,
  },
  {
    id: 'experience',
    title: 'Pet experience?',
    emoji: '🐾',
    subtitle: 'No judgment here - everyone starts somewhere!',
    options: [
      { value: 'first_time', label: 'First-time owner', emoji: '🌱' },
      { value: 'some_experience', label: 'Had pets before', emoji: '😊' },
      { value: 'experienced', label: 'Very experienced', emoji: '🏆' },
    ],
    field: 'experienceLevel' as const,
  },
  {
    id: 'household',
    title: 'Who lives with you?',
    emoji: '👨‍👩‍👧‍👦',
    subtitle: 'Some pets do better in certain households',
    options: [
      { value: 'no_kids', label: 'No kids', emoji: '👤' },
      { value: 'older_kids', label: 'Kids 10+', emoji: '🧒' },
      { value: 'young_kids', label: 'Young kids', emoji: '👶' },
    ],
    field: 'hasChildren' as const,
    transform: (v: string) => v !== 'no_kids',
  },
  {
    id: 'other_pets',
    title: 'Any current pets?',
    emoji: '🐕‍🦺',
    subtitle: 'We\'ll find pets that get along',
    options: [
      { value: 'none', label: 'No pets', emoji: '🚫' },
      { value: 'dogs', label: 'Dogs', emoji: '🐕' },
      { value: 'cats', label: 'Cats', emoji: '🐱' },
      { value: 'both', label: 'Dogs & Cats', emoji: '🐾' },
    ],
    field: 'hasOtherPets' as const,
    secondaryField: 'otherPetTypes' as const,
  },
  {
    id: 'activity',
    title: 'Your activity level?',
    emoji: '🏃',
    subtitle: 'Energy levels should match!',
    options: [
      { value: 'couch_potato', label: 'Couch potato', emoji: '🛋️' },
      { value: 'moderate', label: 'Moderate', emoji: '🚶' },
      { value: 'active', label: 'Active', emoji: '🏃' },
      { value: 'very_active', label: 'Very active', emoji: '🏋️' },
    ],
    field: 'activityLevel' as const,
  },
  {
    id: 'species',
    title: 'Looking for...?',
    emoji: '💕',
    subtitle: 'Or keep exploring all!',
    options: [
      { value: null, label: 'Show me all!', emoji: '🐾' },
      { value: 'Dog', label: 'Dogs', emoji: '🐕' },
      { value: 'Cat', label: 'Cats', emoji: '🐱' },
    ],
    field: 'preferredSpecies' as const,
  },
];

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingData>>({});

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const handleSelect = (value: string | null) => {
    const newAnswers = { ...answers };
    
    // Handle special transformations
    if (step.id === 'household') {
      newAnswers.hasChildren = value !== 'no_kids';
    } else if (step.id === 'other_pets') {
      newAnswers.hasOtherPets = value !== 'none';
      newAnswers.otherPetTypes = value === 'none' ? null : value;
    } else {
      (newAnswers as Record<string, string | null>)[step.field] = value;
    }
    
    setAnswers(newAnswers);

    // Auto-advance after short delay
    setTimeout(() => {
      if (isLastStep) {
        onComplete(newAnswers as OnboardingData);
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }, 300);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white relative">
          <button 
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition"
          >
            <X size={20} />
          </button>
          
          <div className="text-5xl mb-3">{step.emoji}</div>
          <h2 className="text-2xl font-black">{step.title}</h2>
          <p className="text-white/80 text-sm mt-1">{step.subtitle}</p>
        </div>
        
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 py-4">
          {STEPS.map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep 
                  ? 'bg-orange-500 w-6' 
                  : i < currentStep 
                    ? 'bg-orange-300' 
                    : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        
        {/* Options */}
        <div className="p-6 space-y-3">
          {step.options.map((option) => (
            <button
              key={option.value ?? 'null'}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:border-orange-300 hover:bg-orange-50 ${
                answers[step.field] === option.value 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200'
              }`}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span className="font-bold text-slate-900">{option.label}</span>
            </button>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-6 pt-0 flex justify-between items-center">
          {currentStep > 0 ? (
            <button 
              onClick={handleBack}
              className="flex items-center gap-1 text-slate-500 font-medium hover:text-slate-700 transition"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          ) : (
            <div />
          )}
          
          <button 
            onClick={onSkip}
            className="text-slate-400 text-sm hover:text-slate-600 transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
