import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [startOut, setStartOut] = useState(false);

  useEffect(() => {
    // Initiate exit transition slightly before triggering onComplete
    const exitTimer = setTimeout(() => {
      setStartOut(true);
    }, 3800);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Border corners animation
  const cornerVariants = {
    hidden: { scale: 0.6, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 0.4,
      transition: {
        delay: 0.1,
        duration: 1.2,
        ease: "easeOut",
      },
    },
  };

  return (
    <AnimatePresence>
      {!startOut && (
        <motion.div 
          className="absolute inset-0 bg-[#070707] flex flex-col items-center justify-center z-50 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(8px)" }}
          transition={{ duration: 0.9, ease: [0.43, 0.13, 0.23, 0.96] }}
        >
          {/* Subtle Ambient Radial Lighting Ring */}
          <motion.div 
            className="absolute w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full bg-luxury-gold/5 blur-3xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.1, 1], opacity: [0, 0.8, 0.5] }}
            transition={{ duration: 3.5, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex max-w-full select-none items-center justify-center px-4">
            {/* Store Hub Official Emblem Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="absolute inset-0 bg-luxury-gold/20 rounded-full blur-2xl animate-pulse scale-110" />
              <img 
                src="/logo.svg" 
                alt="STORE HUB Logo" 
                className="relative z-10 h-[480px] w-[480px] max-w-none object-contain filter drop-shadow-[0_0_25px_rgba(212,175,55,0.45)]" 
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>

          {/* Decorative luxury corners drawing themselves inwards */}
          <motion.div 
            variants={cornerVariants}
            initial="hidden"
            animate="visible"
            className="absolute top-8 left-8 w-6 h-6 border-t border-l border-luxury-gold/50" 
          />
          <motion.div 
            variants={cornerVariants}
            initial="hidden"
            animate="visible"
            className="absolute top-8 right-8 w-6 h-6 border-t border-r border-luxury-gold/50" 
          />
          <motion.div 
            variants={cornerVariants}
            initial="hidden"
            animate="visible"
            className="absolute bottom-8 left-8 w-6 h-6 border-b border-l border-luxury-gold/50" 
          />
          <motion.div 
            variants={cornerVariants}
            initial="hidden"
            animate="visible"
            className="absolute bottom-8 right-8 w-6 h-6 border-b border-r border-luxury-gold/50" 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
