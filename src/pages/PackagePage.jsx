import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const PackagePage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [pkg, setPkg] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [whatsappNumber, setWhatsappNumber] = useState('919975526627');

    useEffect(() => {
        const fetchPackage = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/packages`);
                if (!response.ok) throw new Error('Failed to fetch packages');
                const data = await response.json();
                const found = data.find(p =>
                    p.title.toLowerCase().replace(/\s+/g, '-') === slug
                );
                setPkg(found || null);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPackage();
    }, [slug]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
                }
            } catch (err) {
                console.error('Failed to fetch settings', err);
            }
        };
        fetchSettings();
    }, []);

    const handleBookNow = () => {
        navigate(`/booking?package=${encodeURIComponent(pkg.title)}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!pkg) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-4 px-6">
                <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 text-center">Package Not Found</h1>
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors">
                    Back to Home
                </button>
            </div>
        );
    }

    const galleryImages = [
        pkg.image,
        '/IMG-20220611-WA0013.jpg',
        '/Pawna-Heart-Camp-01.webp',
        '/Pawna-lake-camp-04.jpg',
        '/fzpesczo08lpcgqo7bz1.jpg'
    ];

    return (
        <div className="min-h-screen bg-[#fafafa] pb-20 lg:pb-0">
            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-1.5 sm:gap-2 text-stone-600 hover:text-stone-900 transition-colors font-medium text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Back to Home</span>
                        <span className="sm:hidden">Back</span>
                    </button>
                    <button
                        onClick={handleBookNow}
                        className="hidden sm:block px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-wide hover:bg-stone-800 transition-all active:scale-[0.98]"
                    >
                        RESERVE NOW
                    </button>
                </div>
            </div>

            {/* Image Gallery */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
                {/* Desktop: Grid layout */}
                <div className="hidden md:grid grid-cols-4 gap-3 rounded-3xl overflow-hidden h-[480px]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden"
                        onClick={() => setActiveImage(0)}
                    >
                        <img src={galleryImages[0]} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </motion.div>
                    {galleryImages.slice(1, 5).map((img, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 * (i + 1) }}
                            className="relative group cursor-pointer overflow-hidden"
                            onClick={() => setActiveImage(i + 1)}
                        >
                            <img src={img} alt={`${pkg.title} ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </motion.div>
                    ))}
                </div>

                {/* Mobile: Horizontal scrolling gallery */}
                <div className="md:hidden">
                    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
                        {galleryImages.map((img, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.05 * i }}
                                className="flex-shrink-0 w-[85vw] h-[55vw] snap-center rounded-2xl overflow-hidden"
                            >
                                <img src={img} alt={`${pkg.title} ${i + 1}`} className="w-full h-full object-cover" />
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-1.5 mt-3">
                        {galleryImages.map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-stone-300"></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 lg:gap-20">

                    {/* Left: Details */}
                    <div className="lg:w-3/5">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-stone-900 tracking-tight mb-2 sm:mb-3">{pkg.title}</h1>

                            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                                <span className="text-xs sm:text-sm font-medium bg-stone-100 text-stone-600 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full">
                                    Up to {pkg.maxCapacity === 0 ? 'Unlimited' : pkg.maxCapacity} Guests
                                </span>
                            </div>

                            {/* Mobile: Inline price card */}
                            <div className="lg:hidden mb-6">
                                <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-stone-100">
                                    <div className="flex items-baseline justify-between mb-4">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-2xl font-bold text-stone-900">{pkg.price}</span>
                                            <span className="text-stone-500 font-light text-sm">/ night</span>
                                        </div>
                                        <span className="text-xs text-stone-400">Meals Included</span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-stone-200 pt-6 sm:pt-8 mb-8 sm:mb-10">
                                <p className="text-stone-600 font-light text-base sm:text-lg leading-relaxed">{pkg.description}</p>
                            </div>

                            <div className="mb-8 sm:mb-10">
                                <h3 className="text-sm font-bold text-stone-900 mb-4 sm:mb-5 uppercase tracking-wider">What this place offers</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 sm:gap-y-4 gap-x-8">
                                    {pkg.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3 text-stone-600 font-light text-sm sm:text-base">
                                            <svg className="w-5 h-5 text-[#25D366] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-stone-200 pt-6 sm:pt-8">
                                <h3 className="text-sm font-bold text-stone-900 mb-4 sm:mb-5 uppercase tracking-wider">Things to know</h3>
                                <div className="grid grid-cols-2 gap-3 sm:gap-6">
                                    <div className="bg-stone-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-stone-100">
                                        <div className="font-medium text-stone-900 mb-1 sm:mb-2 text-xs sm:text-sm">Check-in</div>
                                        <p className="text-stone-500 text-xs sm:text-sm font-light">From 2:00 PM</p>
                                    </div>
                                    <div className="bg-stone-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-stone-100">
                                        <div className="font-medium text-stone-900 mb-1 sm:mb-2 text-xs sm:text-sm">Check-out</div>
                                        <p className="text-stone-500 text-xs sm:text-sm font-light">Before 11:00 AM</p>
                                    </div>
                                    <div className="bg-stone-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-stone-100">
                                        <div className="font-medium text-stone-900 mb-1 sm:mb-2 text-xs sm:text-sm">Cancellation</div>
                                        <p className="text-stone-500 text-xs sm:text-sm font-light">Free up to 48h before</p>
                                    </div>
                                    <div className="bg-stone-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-stone-100">
                                        <div className="font-medium text-stone-900 mb-1 sm:mb-2 text-xs sm:text-sm">Meals</div>
                                        <p className="text-stone-500 text-xs sm:text-sm font-light">Veg & Non-Veg</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Sticky Pricing Card (Desktop only) */}
                    <div className="hidden lg:block lg:w-2/5">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="sticky top-24"
                        >
                            <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-stone-100">
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-3xl font-bold text-stone-900">{pkg.price}</span>
                                    <span className="text-stone-500 font-light text-sm">/ night</span>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center justify-between py-3 border-b border-stone-100">
                                        <span className="text-sm text-stone-500">Package</span>
                                        <span className="text-sm font-medium text-stone-900">{pkg.title}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-stone-100">
                                        <span className="text-sm text-stone-500">Max Guests</span>
                                        <span className="text-sm font-medium text-stone-900">{pkg.maxCapacity === 0 ? 'Unlimited' : pkg.maxCapacity}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-sm text-stone-500">Meals Included</span>
                                        <span className="text-sm font-medium text-stone-900">Yes</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBookNow}
                                    className="w-full py-4 bg-stone-900 text-white rounded-2xl text-sm font-bold tracking-wide hover:bg-stone-800 transition-all hover:shadow-xl active:scale-[0.98]"
                                >
                                    BOOK NOW
                                </button>

                                <p className="text-center text-xs text-stone-400 mt-3 font-light">You won't be charged yet</p>
                            </div>

                            <div className="mt-4 bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 text-center">
                                <p className="text-sm text-stone-500 font-light mb-3">Have questions about this accommodation?</p>
                                <a
                                    href={`https://wa.me/${whatsappNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[#25D366] font-medium text-sm hover:underline"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.474-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                    </svg>
                                    Contact us on WhatsApp
                                </a>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Mobile: Fixed Bottom Booking Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-stone-200 px-4 py-3 flex items-center justify-between safe-bottom">
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-stone-900">{pkg.price}</span>
                        <span className="text-stone-500 font-light text-xs">/ night</span>
                    </div>
                    <span className="text-xs text-stone-400">Meals included</span>
                </div>
                <button
                    onClick={handleBookNow}
                    className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold tracking-wide active:scale-[0.96] transition-transform"
                >
                    BOOK NOW
                </button>
            </div>

            {/* Footer */}
            <div className="border-t border-stone-100 py-6 sm:py-8 text-center">
                <p className="text-sm text-stone-400 font-light">© Pawna Camping. All rights reserved.</p>
            </div>
        </div>
    );
};

export default PackagePage;
