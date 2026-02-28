import { motion } from 'framer-motion';

const About = () => {
    return (
        <section className="py-24 md:py-32 bg-white px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="lg:w-1/2"
                >
                    <span className="text-stone-400 text-sm font-medium tracking-widest uppercase mb-4 block">Our Story</span>
                    <h2 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-8 tracking-tight leading-tight">
                        Reconnect with the <br className="hidden md:block" /> rhythms of nature.
                    </h2>
                    <div className="space-y-6 text-stone-500 font-light text-lg">
                        <p>
                            Nestled along the pristine shores of Pawna Lake, our camp offers an idyllic escape from the relentless pace of city life. We believe in creating spaces where silence speaks and nature heals.
                        </p>
                        <p>
                            Our philosophy is simple: minimal impact on the environment, maximum impact on your soul. Whether you're watching the mist roll over the lake at dawn or stargazing by the warmth of a campfire, every moment here is crafted to bring you closer to the earth and to yourself.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="lg:w-1/2 w-full relative"
                >
                    <div className="w-full aspect-square md:aspect-[4/3] bg-stone-100 rounded-[2rem] flex items-center justify-center relative overflow-hidden shadow-xl">
                        <img
                            src="/about.jpg"
                            alt="About Pawna Camping"
                            className="w-full h-full object-cover"
                        />

                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full z-10 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 blur-3xl rounded-full z-10 pointer-events-none"></div>
                    </div>
                </motion.div>

            </div>
        </section>
    );
};

export default About;
