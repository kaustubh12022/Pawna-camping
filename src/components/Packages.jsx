import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Packages = () => {
    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/packages`);
                if (!response.ok) throw new Error('Failed to fetch packages');
                const data = await response.json();
                setPackages(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPackages();
    }, []);

    const handleCardClick = (pkg) => {
        const slug = pkg.title.toLowerCase().replace(/\s+/g, '-');
        navigate(`/package/${slug}`);
    };

    return (
        <section className="py-16 sm:py-24 md:py-32 bg-[#fafafa] px-4 sm:px-6 lg:px-8 border-b border-stone-100">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-10 sm:mb-20"
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-stone-900 mb-4 sm:mb-6 tracking-tight">Stay With Us</h2>
                    <p className="text-stone-500 max-w-2xl mx-auto text-base sm:text-lg font-light px-2">
                        Choose from our carefully curated accommodations designed to connect you with nature without compromising on comfort.
                    </p>
                </motion.div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 mb-8">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
                        {packages.map((pkg, index) => (
                            <motion.div
                                key={pkg._id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.8, delay: index * 0.1 }}
                                onClick={() => handleCardClick(pkg)}
                                className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.12)] transition-all duration-300 border border-stone-100 flex flex-col cursor-pointer transform hover:-translate-y-1 active:scale-[0.98]"
                            >
                                <div className="h-52 sm:h-64 md:h-72 w-full bg-stone-200 relative overflow-hidden">
                                    <img
                                        src={pkg.image}
                                        alt={pkg.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                </div>

                                <div className="p-5 sm:p-6 md:p-8 flex flex-col flex-grow">
                                    <div className="mb-1 sm:mb-2 flex justify-between items-start">
                                        <h3 className="text-xl sm:text-2xl font-semibold text-stone-900 leading-tight pr-3">{pkg.title}</h3>
                                        <span className="text-base sm:text-lg font-medium text-stone-900 whitespace-nowrap">{pkg.price}<span className="text-xs font-light text-stone-500">/night</span></span>
                                    </div>

                                    <p className="text-stone-500 font-light text-sm line-clamp-2 mt-1 sm:mt-2">
                                        {pkg.description}
                                    </p>

                                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-stone-100 flex items-center justify-between text-sm">
                                        <div className="text-stone-500 font-medium">
                                            Max {pkg.maxCapacity === 0 ? 'Unlimited' : pkg.maxCapacity} Guests
                                        </div>
                                        <div className="text-[#25D366] font-medium flex items-center gap-1">
                                            View Details
                                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Packages;
