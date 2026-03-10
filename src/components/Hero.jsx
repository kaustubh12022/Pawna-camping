import { motion } from 'framer-motion';

const Hero = () => {
    return (
        <section className="relative h-[100svh] w-full bg-stone-200 flex items-center justify-center overflow-hidden">

            <div className="absolute inset-0 z-0 bg-stone-900">
                <video
                    src="/hero.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    fetchPriority="high"
                    className="w-full h-full object-cover"
                    style={{ willChange: 'transform' }}
                />
            </div>

            <div className="absolute inset-0 z-10 bg-black/40"></div>

            <div className="relative z-20 text-center px-5 sm:px-6 flex flex-col items-center max-w-4xl mx-auto mt-10 sm:mt-20">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="text-[2.75rem] sm:text-6xl md:text-8xl font-semibold text-white tracking-tight mb-5 sm:mb-8 drop-shadow-lg leading-[1.1]"
                >
                    Escape to <span className="italic font-light">Pawna</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="text-base sm:text-xl md:text-2xl text-stone-100 font-light mb-8 sm:mb-12 max-w-2xl drop-shadow-md leading-relaxed"
                >
                    Discover tranquility by the lakeside. Premium camping experiences immersed in nature.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                    <a href="#booking" className="inline-block bg-white/90 backdrop-blur-md text-stone-900 px-8 py-4 sm:px-10 sm:py-5 rounded-full text-xs sm:text-sm font-bold tracking-widest uppercase hover:bg-white hover:scale-105 transition-all duration-500 shadow-2xl">
                        Reserve Your Stay
                    </a>
                </motion.div>
            </div>

            {/* Floating Scroll Indicator - hidden on mobile */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.5 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20 hidden sm:flex"
            >
                <span className="text-white/60 text-xs tracking-[0.2em] font-light uppercase">Scroll</span>
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-[1px] h-12 bg-gradient-to-b from-white/60 to-transparent"
                />
            </motion.div>
        </section>
    );
};

export default Hero;
