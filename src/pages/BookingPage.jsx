import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Booking from '../components/Booking';
import Footer from '../components/Footer';

const BookingPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preSelectedPackage = searchParams.get('package');

    useEffect(() => {
        // Dispatch event if a package was pre-selected via URL
        if (preSelectedPackage) {
            window.dispatchEvent(new CustomEvent('selectPackage', { detail: preSelectedPackage }));
        }
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, [preSelectedPackage]);

    return (
        <div className="min-h-screen bg-[#fafafa]">
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
                    <h1 className="text-sm sm:text-base font-semibold text-stone-900 tracking-tight">Book Your Stay</h1>
                    <div className="w-16" /> {/* Spacer for centering */}
                </div>
            </div>

            {/* Hero Banner */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="relative bg-stone-900 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-stone-900/80 via-stone-900/60 to-stone-900/90 z-10" />
                <img
                    src="/Pawna-Heart-Camp-01.webp"
                    alt="Pawna Camping"
                    className="w-full h-40 sm:h-52 md:h-64 object-cover opacity-60"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2"
                    >
                        Reserve Your Stay
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-stone-300 font-light text-sm sm:text-base max-w-md"
                    >
                        Complete your booking in just a few simple steps
                    </motion.p>
                </div>
            </motion.div>

            {/* Booking Form */}
            <Booking />

            {/* Footer */}
            <Footer />
        </div>
    );
};

export default BookingPage;
