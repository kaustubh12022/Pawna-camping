import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const isVideo = (url) => {
    if (!url) return false;
    const lowerUrl = typeof url === 'string' ? url.toLowerCase() : url.url?.toLowerCase() || '';
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm');
};

const MediaRenderer = ({ src, alt, className }) => {
    const url = typeof src === 'string' ? src : src?.url;
    if (isVideo(url)) {
        return <video src={url} className={className} autoPlay loop muted playsInline />;
    }
    return <img loading="lazy" src={url} alt={alt} className={className} />;
};

const CampsiteDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState(null);
    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [whatsappNumber, setWhatsappNumber] = useState('919975526627');

    useEffect(() => {
        const fetchPropertyAndPackages = async () => {
            try {
                // Fetch property by slug
                const propRes = await fetch(`${import.meta.env.VITE_API_URL}/api/properties/${slug}`);
                if (!propRes.ok) throw new Error('Failed to fetch property');
                const propData = await propRes.json();
                setProperty(propData);

                // If found, fetch its packages
                if (propData && propData._id) {
                    const pkgRes = await fetch(`${import.meta.env.VITE_API_URL}/api/packages?propertyId=${propData._id}`);
                    if (pkgRes.ok) {
                        const pkgData = await pkgRes.json();
                        setPackages(pkgData);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPropertyAndPackages();
    }, [slug]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'default');
    }, []);

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

    const handleBookPackage = (pkgTitle) => {
        navigate(`/booking?propertyId=${property._id}&package=${encodeURIComponent(pkgTitle)}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center gap-4 px-6">
                <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 text-center">Campsite Not Found</h1>
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors">
                    Back to Home
                </button>
            </div>
        );
    }

    const galleryImages = property.images && property.images.length > 0 
        ? property.images.map(img => typeof img === 'string' ? img : img.url)
        : [(typeof property.coverImage === 'string' ? property.coverImage : property.coverImage?.url), '/IMG-20220611-WA0013.jpg', '/Pawna-Heart-Camp-01.webp', '/Pawna-lake-camp-04.jpg', '/fzpesczo08lpcgqo7bz1.jpg'].filter(Boolean);

    return (
        <div className="min-h-screen bg-[var(--listing-bg)] text-[var(--listing-text-primary)] pb-20 lg:pb-0 transition-colors duration-500">
            {/* Top Navigation */}
            <div className="sticky top-0 z-50 bg-[var(--listing-bg)]/80 backdrop-blur-xl border-b border-[var(--listing-border)] transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/#properties')}
                        className="flex items-center gap-1.5 sm:gap-2 text-[var(--listing-text-secondary)] hover:text-[var(--listing-accent)] transition-colors font-medium text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">All Properties</span>
                        <span className="sm:hidden">Back</span>
                    </button>
                    <div className="text-sm font-semibold uppercase tracking-widest">{property.name}</div>
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
                        <MediaRenderer src={galleryImages[0]} alt={property.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
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
                            <MediaRenderer src={img} alt={`${property.name} ${i + 2}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
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
                                <MediaRenderer src={img} alt={`${property.name} ${i + 1}`} className="w-full h-full object-cover" />
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
                            <div className="inline-block px-3 py-1 mb-4 bg-[var(--listing-accent)]/10 text-[var(--listing-accent)] text-xs font-semibold uppercase tracking-widest rounded-full">
                                Campsite
                            </div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-2 sm:mb-3">{property.name}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-[var(--listing-text-secondary)] text-sm mb-6 sm:mb-8 font-light">
                                {property.googleMapsLink && (
                                    <a href={property.googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:underline">
                                        <svg className="w-4 h-4 text-[var(--listing-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> 
                                        View on Map
                                    </a>
                                )}
                                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-[var(--listing-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> Max {property.maxGuests} Guests</span>
                            </div>

                            <div className="border-t border-[var(--listing-border)] pt-6 sm:pt-8 mb-8 sm:mb-10">
                                {property.shortDescription && (
                                    <p className="text-[var(--listing-text-primary)] font-medium text-lg sm:text-xl leading-relaxed whitespace-pre-line mb-4">{property.shortDescription}</p>
                                )}
                                <p className="text-[var(--listing-text-secondary)] font-light text-base sm:text-lg leading-relaxed whitespace-pre-line">{property.description}</p>
                            </div>

                            {property.amenities && property.amenities.length > 0 && (
                                <div className="mb-8 sm:mb-10 pt-8 border-t border-[var(--listing-border)]">
                                    <h3 className="text-xl font-semibold mb-6">What this place offers</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                                        {property.amenities.flatMap(a => typeof a === 'string' ? a.split(',').map(s => s.trim()).filter(Boolean) : [a]).map((amenity, i) => (
                                            <div key={i} className="flex items-center gap-4 text-[var(--listing-text-primary)]">
                                                <svg className="w-6 h-6 text-stone-700 font-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-base font-light">{amenity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {property.rules && property.rules.length > 0 && (
                                <div className="mb-8 sm:mb-10 pt-8 border-t border-[var(--listing-border)]">
                                    <h3 className="text-xl font-semibold mb-6">Things to know</h3>
                                    <div className="space-y-4">
                                        {property.rules.flatMap(r => typeof r === 'string' ? r.split(',').map(s => s.trim()).filter(Boolean) : [r]).map((rule, i) => (
                                            <div key={i} className="flex items-start gap-4 text-[var(--listing-text-primary)]">
                                                <svg className="w-6 h-6 text-stone-700 font-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-base font-light leading-relaxed">{rule}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Right: Packages Information (Desktop only) */}
                    <div className="hidden lg:block lg:w-2/5">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="sticky top-24"
                        >
                            <div className="bg-[var(--listing-card-bg)] rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[var(--listing-border)]">
                                <h3 className="text-xl font-semibold mb-2">Available Packages</h3>
                                <p className="text-sm text-[var(--listing-text-secondary)] font-light mb-6">Select a package from below to book your stay.</p>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-[var(--listing-border)]">
                                        <span className="text-sm text-[var(--listing-text-secondary)]">Check-in</span>
                                        <span className="text-sm font-medium">{property.checkInTime}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-sm text-[var(--listing-text-secondary)]">Check-out</span>
                                        <span className="text-sm font-medium">{property.checkOutTime}</span>
                                    </div>
                                </div>

                                <div className="mt-8 bg-[var(--listing-bg)] border border-[var(--listing-border)] rounded-2xl p-4 text-center">
                                    <a
                                        href={`https://wa.me/${property.whatsappNumber || whatsappNumber}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-[var(--listing-accent)] font-medium text-sm hover:underline"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.474-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                        </svg>
                                        Questions? Chat on WhatsApp
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Packages Section */}
            <div className="bg-[var(--listing-bg)] border-t border-[var(--listing-border)] py-16 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl sm:text-3xl font-semibold mb-3 tracking-tight">Choose Your Experience</h2>
                        <p className="text-[var(--listing-text-secondary)] font-light max-w-2xl mx-auto">We offer a variety of packages to suit your needs. Pick the one that fits your perfect getaway.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {packages.map((pkg, idx) => (
                            <motion.div 
                                key={pkg._id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className="bg-[var(--listing-card-bg)] rounded-2xl border border-[var(--listing-border)] p-6 sm:p-8 flex flex-col h-full hover:shadow-lg transition-shadow"
                            >
                                <div className="mb-4">
                                    <h3 className="text-xl font-semibold mb-2">{pkg.title}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-bold">{pkg.price}</span>
                                        <span className="text-[var(--listing-text-secondary)] font-light text-sm">/ night</span>
                                    </div>
                                </div>
                                <p className="text-[var(--listing-text-secondary)] font-light text-sm mb-6 flex-grow">{pkg.description}</p>
                                <div className="space-y-3 mb-8">
                                    {pkg.features.slice(0, 4).map((feature, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[var(--listing-text-secondary)] font-light text-sm">
                                            <svg className="w-4 h-4 text-[var(--listing-accent)] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="leading-tight">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleBookPackage(pkg.title)}
                                    className="w-full py-3.5 bg-[var(--listing-accent)] text-white rounded-xl text-sm font-bold tracking-wide hover:opacity-90 transition-opacity active:scale-[0.98] mt-auto uppercase"
                                >
                                    Contact Owner
                                </button>
                                <p className="text-[10px] text-[var(--listing-text-secondary)] text-center leading-tight mt-3">
                                    This will redirect you to WhatsApp after form filling. No charges will be applied.
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--listing-border)] py-6 sm:py-8 text-center bg-[var(--listing-bg)]">
                <p className="text-sm text-[var(--listing-text-secondary)] font-light">© Lonavala Stays. All rights reserved.</p>
            </div>
        </div>
    );
};

export default CampsiteDetail;
