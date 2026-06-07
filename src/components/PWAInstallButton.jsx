import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const PWAInstallButton = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            setIsInstalled(true);
            return;
        }

        // Check if user previously dismissed (within 24 hours)
        const dismissedAt = localStorage.getItem('pwa-install-dismissed');
        if (dismissedAt && Date.now() - parseInt(dismissedAt) < 24 * 60 * 60 * 1000) {
            return;
        }

        // If there's already a stashed prompt from index.html, grab it
        if (window.deferredPrompt) {
            setDeferredPrompt(window.deferredPrompt);
            setIsVisible(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
            // Clear the global reference
            window.deferredPrompt = e;
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsVisible(false);
            setDeferredPrompt(null);
            window.deferredPrompt = null;
            setShowToast(true);
            setTimeout(() => setShowToast(false), 4000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                setIsVisible(false);
                setDeferredPrompt(null);
                window.deferredPrompt = null;
            }
        } catch (err) {
            console.error('Install prompt error:', err);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Don't render if already installed or on manager/owner dashboard
    const isDashboard = location.pathname.startsWith('/manager') || location.pathname.startsWith('/owner');
    if (isInstalled || isDashboard) return null;

    return (
        <>
            {/* Install Banner — fixed at bottom */}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-6 sm:max-w-sm z-[9999]"
                        id="pwa-install-banner"
                    >
                        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl shadow-2xl border border-stone-700/50 overflow-hidden backdrop-blur-xl">
                            {/* Subtle shimmer bar at top */}
                            <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 animate-pulse" />
                            
                            <div className="p-4 sm:p-5">
                                <div className="flex items-start gap-3">
                                    {/* App Icon */}
                                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg flex-shrink-0 ring-2 ring-emerald-400/30">
                                        <img 
                                            src="/pwa-icon-192.png" 
                                            alt="Lonavala Stays" 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm sm:text-base text-white leading-tight">
                                            Install Lonavala Stays
                                        </h3>
                                        <p className="text-stone-400 text-xs sm:text-sm mt-1 leading-snug">
                                            Add to home screen for quick access & offline browsing
                                        </p>
                                    </div>

                                    {/* Close button */}
                                    <button
                                        onClick={handleDismiss}
                                        className="text-stone-500 hover:text-stone-300 transition-colors p-1 flex-shrink-0 -mt-1 -mr-1"
                                        aria-label="Dismiss install prompt"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleDismiss}
                                        className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-medium text-stone-400 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all duration-200"
                                    >
                                        Not Now
                                    </button>
                                    <button
                                        onClick={handleInstallClick}
                                        className="flex-1 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5"
                                        id="pwa-install-button"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Install App
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Toast */}
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        App installed successfully!
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default PWAInstallButton;
