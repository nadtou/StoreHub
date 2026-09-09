import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
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
    audiences: [],
    styles: [],
    favoriteCategories: []
  });

  const question = styleQuiz[currentStep];
  const currentSelections = selections[question.id] || [];
  const canContinue = currentSelections.length > 0;

  const handleOptionSelect = (value: string) => {
    setSelections(previous => {
      const selected = previous[question.id] || [];
      const next = question.selectionMode === 'single'
        ? [value]
        : selected.includes(value)
          ? selected.filter(item => item !== value)
          : [...selected, value];

      return { ...previous, [question.id]: next };
    });
  };

  const handleNext = () => {
    if (!canContinue) return;

    if (currentStep < styleQuiz.length - 1) {
      setCurrentStep(step => step + 1);
      return;
    }

    onComplete({
      audiences: selections.audiences,
      styles: selections.styles,
      sizes: ['M', '38'],
      favoriteCategories: selections.favoriteCategories
    });
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(step => step - 1);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-y-auto bg-luxury-dark text-white">
      <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between px-5 pb-4 pt-7">
        <span className="serif-title text-lg font-light tracking-[0.22em] text-luxury-gold">STOREHUB</span>
        <button
          type="button"
          onClick={onSkip}
          className="min-h-11 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-luxury-gold"
        >
          Passer le quiz
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-4">
        <div className="mb-6 max-w-2xl">
          <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-luxury-gold">
              Étape {currentStep + 1} / {styleQuiz.length}
            </span>
            <div className="h-px flex-1 bg-luxury-border">
              <div
                className="h-px bg-luxury-gold transition-all duration-500"
                style={{ width: `${((currentStep + 1) / styleQuiz.length) * 100}%` }}
              />
            </div>
          </div>

          <h1 className="serif-title text-[1.7rem] font-light leading-tight tracking-wide text-white">
            {question.text}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{question.helper}</p>
        </div>

        <div className={`grid w-full gap-3 ${question.id === 'audiences' ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {question.options.map(option => {
            const isSelected = currentSelections.includes(option.value);
            const isAudienceOption = question.id === 'audiences';

            return (
              <button
                type="button"
                key={option.value}
                aria-pressed={isSelected}
                onClick={() => handleOptionSelect(option.value)}
                className={`group relative min-w-0 overflow-hidden border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-luxury-gold focus-visible:ring-offset-2 focus-visible:ring-offset-luxury-dark ${
                  isAudienceOption ? 'min-h-24' : 'min-h-44'
                } ${
                  isSelected
                    ? 'border-luxury-gold bg-luxury-gold/[0.06] shadow-[0_0_0_1px_rgba(212,175,55,0.18)]'
                    : 'border-luxury-border bg-luxury-panel hover:border-luxury-gold/50'
                }`}
              >
                {option.image ? (
                  <>
                    <img
                      src={option.image}
                      alt=""
                      loading="lazy"
                      className={`absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03] ${
                        isSelected ? 'grayscale-0' : 'grayscale'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                  </>
                ) : (
                  <div className="absolute inset-y-0 left-0 flex w-20 items-center justify-center border-r border-luxury-border" aria-hidden="true">
                    <span className={`serif-title text-5xl font-light leading-none transition-colors ${
                      isSelected ? 'text-luxury-gold/30' : 'text-white/[0.06] group-hover:text-luxury-gold/15'
                    }`}>
                      {option.monogram}
                    </span>
                  </div>
                )}

                <span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center border transition-colors ${
                  isSelected ? 'border-luxury-gold bg-luxury-gold text-black' : 'border-white/25 bg-black/35 text-transparent'
                }`}>
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>

                <span className={`absolute flex flex-col ${isAudienceOption ? 'inset-y-0 left-20 right-11 justify-center px-4' : 'inset-x-0 bottom-0 p-4'}`}>
                  <span className="serif-title text-lg font-light leading-tight text-white">{option.label}</span>
                  <span className="mt-1 text-[11px] leading-snug text-zinc-400">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="sticky bottom-0 z-10 mt-4 border-t border-luxury-border bg-luxury-dark/95 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex min-h-12 items-center gap-2 border px-4 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
              currentStep === 0
                ? 'pointer-events-none border-transparent text-transparent'
                : 'border-luxury-border text-zinc-400 hover:border-luxury-gold hover:text-luxury-gold'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue}
            className={`flex min-h-12 min-w-36 items-center justify-center gap-2 px-5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-all ${
              canContinue
                ? 'bg-luxury-gold text-black hover:bg-[#e6c756]'
                : 'cursor-not-allowed border border-luxury-border bg-luxury-panel text-zinc-600'
            }`}
          >
            {currentStep === styleQuiz.length - 1 ? 'Terminer' : 'Continuer'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
