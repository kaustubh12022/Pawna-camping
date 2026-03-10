import { motion } from 'framer-motion';

const Gallery = () => {
    const galleryItems = [
        { id: 1, type: 'image', src: '/IMG-20220611-WA0013.jpg', alt: 'Lakeside Camping' },
        { id: 2, type: 'image', src: '/Pawna-Heart-Camp-01.webp', alt: 'Heart Camp' },
        { id: 3, type: 'image', src: '/cottage.jpg', alt: 'Cottage View' },
        { id: 4, type: 'image', src: '/Pawna-lake-camp-04.jpg', alt: 'Lake Camp' },
        { id: 5, type: 'image', src: '/Pawna-lake-camping-camp-C-02-e1700593284643.webp', alt: 'Campsite' },
        { id: 6, type: 'image', src: '/fzpesczo08lpcgqo7bz1.jpg', alt: 'Evening View' },
        { id: 7, type: 'image', src: '/pawna-lake-luxury-camping-jpg.webp', alt: 'Luxury Camping' },
        { id: 8, type: 'image', src: '/Pawna-lake-camping-pawnacamp-72-768x512.jpg', alt: 'Pawna Camp' },
    ];

    const doubledItems = [...galleryItems, ...galleryItems];

    return (
        <section className="py-16 sm:py-24 md:py-32 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    <span className="text-stone-400 text-sm font-bold tracking-widest uppercase mb-3 sm:mb-4 block flex items-center justify-center gap-3">
                        <div className="w-8 h-[1px] bg-stone-300"></div>
                        Gallery
                        <div className="w-8 h-[1px] bg-stone-300"></div>
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-stone-900 mb-4 sm:mb-6 tracking-tight">
                        Moments at <span className="italic font-light text-stone-500">Pawna</span>
                    </h2>
                    <p className="text-stone-500 max-w-xl mx-auto text-base sm:text-lg font-light px-2">
                        A glimpse into the experiences that await you by the lakeside.
                    </p>
                </motion.div>
            </div>

            {/* Auto-scrolling Strip Row 1 (left to right) */}
            <div className="relative mb-3 sm:mb-4">
                <motion.div
                    className="flex gap-3 sm:gap-4"
                    animate={{ x: ['0%', '-50%'] }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: 'loop',
                            duration: 20,
                            ease: 'linear',
                        },
                    }}
                >
                    {doubledItems.map((item, i) => (
                        <div
                            key={`row1-${i}`}
                            className="flex-shrink-0 w-[240px] h-[160px] sm:w-[320px] sm:h-[220px] md:w-[400px] md:h-[280px] rounded-xl sm:rounded-2xl overflow-hidden relative group"
                        >
                            <img
                                src={item.src}
                                alt={item.alt}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-stone-900/0 transition-colors duration-500"></div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Auto-scrolling Strip Row 2 (right to left) */}
            <div className="relative">
                <motion.div
                    className="flex gap-3 sm:gap-4"
                    animate={{ x: ['-50%', '0%'] }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: 'loop',
                            duration: 25,
                            ease: 'linear',
                        },
                    }}
                >
                    {[...doubledItems].reverse().map((item, i) => (
                        <div
                            key={`row2-${i}`}
                            className="flex-shrink-0 w-[200px] h-[140px] sm:w-[280px] sm:h-[200px] md:w-[360px] md:h-[240px] rounded-xl sm:rounded-2xl overflow-hidden relative group"
                        >
                            <img
                                src={item.src}
                                alt={item.alt}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-stone-900/0 transition-colors duration-500"></div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default Gallery;
