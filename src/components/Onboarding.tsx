import { useState } from 'react';
import { styleQuiz } from '../mockData';
import { UserPreferences } from '../types';

interface OnboardingProps {
  onComplete: (preferences: UserPreferences) => void;
  onSkip: () => void;
}

export default function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({
    styles: [],
    favoriteCategories: []
  });

  const question = styleQuiz[currentStep];

  const handleOptionSelect = (value: string) => {
    const field = question.id;
    setSelections(prev => {
      const currentVals = prev[field] || [];
      const updated = currentVals.includes(value)
        ? currentVals.filter(v => v !== value)
        : [...currentVals, value];
      return { ...prev, [field]: updated };
    });
  };

  const handleNext = () => {
    if (currentStep < styleQuiz.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete({
        styles: selections.styles.length > 0 ? selections.styles : ['Minimaliste'],
        sizes: ['M', '38'],
        favoriteCategories: selections.favoriteCategories.length > 0 ? selections.favoriteCategories : ['robes', 'outerwear']
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="absolute inset-0 bg-luxury-dark flex flex-col justify-between p-6 md:p-12 z-40 overflow-y-auto">
      {/* Top bar */}
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full pt-4">
        <span className="serif-title text-luxury-gold text-lg tracking-widest font-light">STOREHUB</span>
        <button 
          onClick={onSkip}
          className="text-zinc-500 hover:text-luxury-gold text-xs tracking-widest uppercase transition-colors"
        >
          Passer le quiz
        </button>
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto w-full flex-grow flex flex-col justify-center my-8">
        <div className="max-w-2xl">
          {/* Step Indicator */}
          <div className="text-luxury-gold/60 font-mono text-xs uppercase tracking-widest mb-2">
            CONSEIL STYLE — QUESTION {currentStep + 1} SUR {styleQuiz.length}
          </div>

          {/* Question Text */}
          <h2 className="serif-title text-2xl md:text-4xl font-light text-white tracking-wide leading-snug mb-8">
            {question.text}
          </h2>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {question.options.map(option => {
            const isSelected = selections[question.id]?.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
                className={`relative group cursor-pointer h-72 rounded-none overflow-hidden border transition-all duration-500 ${
                  isSelected 
                    ? 'border-luxury-gold scale-[1.02]' 
                    : 'border-luxury-border hover:border-luxury-gold/40'
                }`}
              >
                {/* Background image */}
                <img
                  src={option.image}
                  alt={option.label}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
                />
                
                {/* Dark gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col justify-end h-1/2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-none border flex items-center justify-center transition-colors duration-300 ${
                      isSelected ? 'border-luxury-gold bg-luxury-gold' : 'border-luxury-border bg-transparent'
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 bg-black rounded-none" />}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-luxury-gold tracking-widest font-semibold">
                      Sélectionner
                    </span>
                  </div>
                  <h3 className="serif-title text-base font-light text-white tracking-wide">
                    {option.label}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons bottom bar */}
      <div className="flex justify-between items-center max-w-5xl mx-auto w-full pb-4">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={`px-6 py-2 border border-luxury-border rounded-none text-xs tracking-widest uppercase transition-all ${
            currentStep === 0 
              ? 'opacity-0 cursor-default' 
              : 'text-zinc-400 hover:border-luxury-gold hover:text-luxury-gold'
          }`}
        >
          Retour
        </button>

        <div className="flex gap-1.5">
          {styleQuiz.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1 transition-all duration-500 rounded-none ${
                idx === currentStep ? 'w-8 bg-luxury-gold' : 'w-2 bg-luxury-border'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          disabled={selections[question.id]?.length === 0}
          className={`px-8 py-2.5 rounded-none text-xs tracking-widest uppercase font-semibold transition-all duration-300 ${
            selections[question.id]?.length > 0
              ? 'bg-luxury-gold text-black hover:bg-luxury-gold/90 cursor-pointer shadow-lg shadow-luxury-gold/10'
              : 'bg-luxury-panel text-zinc-600 border border-luxury-border cursor-not-allowed'
          }`}
        >
          {currentStep === styleQuiz.length - 1 ? 'Terminer' : 'Suivant'}
        </button>
      </div>
    </div>
  );
}
