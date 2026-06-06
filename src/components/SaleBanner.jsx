import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SaleBanner = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const scrollToProperties = () => {
        const propsSection = document.getElementById('properties');
        if (propsSection) {
            propsSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[var(--listing-accent)] text-white relative z-50 overflow-hidden transition-colors duration-500"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-sm sm:text-base">
                    <div className="flex-1 flex justify-center items-center gap-2 sm:gap-4 font-medium tracking-wide">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wider animate-pulse">Live</span>
                        <p className="truncate">
                            Monsoon Flash Sale! Get up to <span className="font-bold underline decoration-2 underline-offset-2">15% OFF</span> on selected properties.
                        </p>
                        <button 
                            onClick={scrollToProperties}
                            className="hidden sm:inline-flex bg-white text-[var(--listing-accent)] px-3 py-1 rounded-full text-xs font-bold hover:bg-stone-100 transition-colors shrink-0"
                        >
                            Book Now
                        </button>
                    </div>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="ml-4 text-white/80 hover:text-white transition-colors shrink-0 p-1"
                        aria-label="Close banner"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SaleBanner;
