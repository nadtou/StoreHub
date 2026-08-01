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

  // Letters of STORE
  const storeLetters = "STORE".split("");
  // Letters of HUB
  const hubLetters = "HUB".split("");

  // Letter animations
  const letterVariants = {
    hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        delay: 0.3 + i * 0.12,
        duration: 0.8,
        ease: [0.215, 0.61, 0.355, 1], // Cubic-bezier easeOutCubic
      },
    }),
  };

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

          <div className="relative flex flex-col items-center select-none max-w-full px-4 text-center z-10">
            {/* Store Hub Official Emblem Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.75, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 relative group"
            >
              <div className="absolute inset-0 bg-luxury-gold/20 rounded-full blur-2xl animate-pulse scale-110" />
              <img 
                src="/logo.svg" 
                alt="STORE HUB Logo" 
                className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain relative z-10 filter drop-shadow-[0_0_25px_rgba(212,175,55,0.45)]" 
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Logo Text with individual letter animations */}
            <div className="flex items-center justify-center select-none mb-1">
              <h1 className="serif-title text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-[0.08em] sm:tracking-[0.15em] text-white flex flex-wrap justify-center select-none">
                {/* STORE letters in white */}
                <span className="flex">
                  {storeLetters.map((char, index) => (
                    <motion.span
                      key={`store-${index}`}
                      custom={index}
                      variants={letterVariants}
                      initial="hidden"
                      animate="visible"
                      className="inline-block"
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>

                {/* Slight gap before HUB */}
                <span className="w-2 sm:w-4 md:w-5" />

                {/* HUB letters in gold */}
                <span className="flex text-luxury-gold">
                  {hubLetters.map((char, index) => (
                    <motion.span
                      key={`hub-${index}`}
                      custom={index + storeLetters.length}
                      variants={letterVariants}
                      initial="hidden"
                      animate="visible"
                      className="inline-block font-normal"
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              </h1>
            </div>

            {/* Elegant golden horizontal expanding bar */}
            <div className="relative h-[1.5px] mt-5 w-36 sm:w-52 md:w-64 bg-zinc-900 overflow-hidden rounded-full">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-transparent via-luxury-gold to-transparent"
                initial={{ left: "-100%", width: "100%" }}
                animate={{ left: "100%" }}
                transition={{
                  delay: 1.4,
                  duration: 2.2,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0.5
                }}
              />
              <motion.div 
                className="absolute left-1/2 -translate-x-1/2 h-full bg-luxury-gold"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
              />
            </div>

            {/* Haute Couture Subtitle with responsive letter tracking expansion */}
            <motion.p 
              className="serif-title mt-4 text-[8px] sm:text-[10px] md:text-xs lg:text-sm font-light text-luxury-gold/80 uppercase select-none"
              initial={{ opacity: 0, letterSpacing: "0.1em", y: 6 }}
              animate={{ opacity: 1, letterSpacing: "0.22em", y: 0 }}
              transition={{ delay: 2.1, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Haute Couture & Boutiques
            </motion.p>
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
