import { motion } from 'framer-motion';

const Hero = () => {
    return (
        <section className="relative h-screen w-full bg-stone-200 flex items-center justify-center overflow-hidden">

            <div className="absolute inset-0 z-0">
                <video
                    src="/hero.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                />
            </div>

            <div className="absolute inset-0 z-10 bg-black/40"></div>

            <div className="relative z-20 text-center px-6 flex flex-col items-center max-w-4xl mx-auto">
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6"
                >
                    Escape to <span className="italic font-light">Pawna</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                    className="text-lg md:text-2xl text-stone-200 font-light mb-10 max-w-2xl"
                >
                    Discover tranquility by the lakeside. Premium camping experiences immersed in nature.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                >
                    <a href="#booking" className="inline-block bg-white text-stone-900 px-8 py-4 rounded-full text-sm font-medium tracking-wide hover:bg-stone-100 transition-colors duration-300 shadow-lg">
                        BOOK YOUR STAY
                    </a>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
