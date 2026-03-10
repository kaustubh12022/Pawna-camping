import { motion } from 'framer-motion';

const About = () => {
    return (
        <section className="py-16 sm:py-24 md:py-32 bg-white px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-stone-50 rounded-full blur-3xl -z-10 opacity-70 translate-x-1/2 -translate-y-1/2"></div>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 sm:gap-16 lg:gap-24">
                {/* Text Content */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="lg:w-1/2 relative z-10"
                >
                    <span className="text-stone-400 text-sm font-bold tracking-widest uppercase mb-3 sm:mb-4 block flex items-center gap-3">
                        <div className="w-8 h-[1px] bg-stone-300"></div> Our Story
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-stone-900 mb-5 sm:mb-8 tracking-tight leading-tight">
                        Reconnect with the <br className="hidden lg:block" />
                        <span className="italic font-light text-stone-500">rhythms of nature.</span>
                    </h2>
                    <div className="space-y-4 sm:space-y-6 text-stone-600 font-light text-base sm:text-lg leading-relaxed">
                        <p>
                            Nestled along the pristine shores of Pawna Lake, our camp offers an idyllic escape from the relentless pace of city life. We believe in creating spaces where silence speaks and nature heals.
                        </p>
                        <p>
                            Our philosophy is simple: minimal impact on the environment, maximum impact on your soul. Whether you're watching the mist roll over the lake at dawn or stargazing by the warmth of a campfire, every moment here is crafted to bring you closer to the earth and to yourself.
                        </p>
                    </div>
                </motion.div>

                {/* Featured Image */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="lg:w-1/2 w-full relative z-10"
                >
                    <div className="w-full aspect-[4/3] sm:aspect-[4/5] bg-stone-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl group relative">
                        <img src="/about.jpg" alt="Camping Scene" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition-colors duration-500"></div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default About;
