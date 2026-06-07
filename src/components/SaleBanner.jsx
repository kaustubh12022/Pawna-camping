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
                className="bg-[var(--listing-accent)] text-white relative z-50 transition-colors duration-500 overflow-hidden"
            >
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex items-center justify-between text-xs sm:text-sm md:text-base overflow-hidden py-2 sm:py-3 h-10 sm:h-12">
                    
                    {/* Live Badge */}
                    <div className="z-10 bg-[var(--listing-accent)] flex items-center pr-2 shrink-0 h-full">
                        <span className="bg-white/20 px-2 py-1 rounded text-[10px] sm:text-xs uppercase font-bold tracking-wider animate-pulse whitespace-nowrap">Live</span>
                    </div>

                    {/* Scrolling Marquee Area */}
                    <div className="flex-1 overflow-hidden relative flex items-center h-full group mask-image-edges">
                        <div className="flex whitespace-nowrap animate-marquee group-hover:pause-marquee items-center min-w-full">
                            <span className="mr-8">
                                🌧️ Monsoon Flash Sale! Get up to <span className="font-bold underline decoration-2 underline-offset-2">15% OFF</span> on selected properties.
                            </span>
                            <span className="mr-8">
                                ✨ Book your weekend getaway now and save big!
                            </span>
                            <span className="mr-8">
                                🌧️ Monsoon Flash Sale! Get up to <span className="font-bold underline decoration-2 underline-offset-2">15% OFF</span> on selected properties.
                            </span>
                            <span className="mr-8">
                                ✨ Book your weekend getaway now and save big!
                            </span>
                        </div>
                    </div>

                    {/* Actions Area */}
                    <div className="z-10 bg-[var(--listing-accent)] flex items-center pl-2 shrink-0 gap-2 sm:gap-4 h-full">
                        <button 
                            onClick={scrollToProperties}
                            className="bg-white text-[var(--listing-accent)] px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold hover:bg-stone-100 transition-colors whitespace-nowrap shadow-sm"
                        >
                            Book Now
                        </button>
                        <button 
                            onClick={() => setIsVisible(false)}
                            className="text-white/80 hover:text-white transition-colors p-1"
                            aria-label="Close banner"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                    .animate-marquee {
                        animation: marquee 20s linear infinite;
                    }
                    @media (max-width: 640px) {
                        .animate-marquee {
                            animation: marquee 10s linear infinite;
                        }
                    }
                    .pause-marquee {
                        animation-play-state: paused;
                    }
                    .mask-image-edges {
                        -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                        mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                    }
                `}} />
            </motion.div>
        </AnimatePresence>
    );
};

export default SaleBanner;
