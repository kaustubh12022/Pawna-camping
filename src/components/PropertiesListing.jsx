import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePromotion } from '../context/PromotionContext';

const PropertiesListing = () => {
    const { discountPercent, calculateMRP } = usePromotion();
    const [properties, setProperties] = useState([]);
    
    const getActualPrice = (prop) => {
        const isWeekend = [0, 6].includes(new Date().getDay()); // Sat, Sun
        return isWeekend ? (prop.pricing?.weekendPrice || prop.pricing?.weekdayPrice || 0) : (prop.pricing?.weekdayPrice || 0);
    };
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState(() => {
        return document.documentElement.getAttribute('data-theme') === 'villa' ? 'villa' : 'all';
    }); // all, campsite, villa
    const [searchLocation, setSearchLocation] = useState('');
    const [sortBy, setSortBy] = useState('recommended'); // recommended, price-low, price-high
    const [guestCount, setGuestCount] = useState('');
    
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/properties?isActive=true`);
                if (!response.ok) throw new Error('Failed to fetch properties');
                const data = await response.json();
                setProperties(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProperties();
    }, []);

    const handleCardClick = (prop) => {
        if (prop.type === 'campsite') {
            navigate(`/campsite/${prop.slug}`);
        } else {
            navigate(`/villa/${prop.slug}`);
        }
    };

    let filteredProperties = properties.filter(prop => {
        if (filterType !== 'all' && prop.type !== filterType) return false;
        if (searchLocation && !prop.address?.toLowerCase().includes(searchLocation.toLowerCase())) return false;
        if (guestCount && prop.maxGuests < parseInt(guestCount)) return false;
        return true;
    });

    if (sortBy === 'price-low') {
        filteredProperties.sort((a, b) => getActualPrice(a) - getActualPrice(b));
    } else if (sortBy === 'price-high') {
        filteredProperties.sort((a, b) => getActualPrice(b) - getActualPrice(a));
    }

    useEffect(() => {
        const theme = filterType === 'villa' ? 'villa' : 'default';
        document.documentElement.setAttribute('data-theme', theme);
    }, [filterType]);

    return (
        <section 
            className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 lg:px-8 border-b transition-colors duration-500 bg-[var(--listing-bg)] border-[var(--listing-border)]" 
            id="properties"
        >
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-10 sm:mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 sm:mb-6 tracking-tight transition-colors duration-500" style={{ color: 'var(--listing-text-primary)' }}>
                        Discover Our Properties
                    </h2>
                    <p className="max-w-2xl mx-auto text-base sm:text-lg font-light px-2 mb-8 transition-colors duration-500" style={{ color: 'var(--listing-text-secondary)' }}>
                        Experience the perfect blend of nature and comfort. Choose between our scenic lakeside campsites or luxurious private villas.
                    </p>

                    {/* Main Category Tabs */}
                    <div className="flex justify-center mb-6">
                        <div className="flex p-1 rounded-full w-full sm:w-auto transition-colors duration-500" style={{ backgroundColor: 'var(--listing-border)' }}>
                            {['all', 'campsite', 'villa'].map(type => (
                                <button 
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-full text-sm font-medium transition-all"
                                    style={{
                                        backgroundColor: filterType === type ? 'var(--listing-card-bg)' : 'transparent',
                                        color: filterType === type ? 'var(--listing-text-primary)' : 'var(--listing-text-secondary)',
                                        boxShadow: filterType === type ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                    }}
                                >
                                    {type === 'all' ? 'All Stays' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Airbnb-style Filters */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:w-72 shrink-0">
                            <input 
                                type="text" 
                                placeholder="Search by location..." 
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all font-light placeholder:opacity-70"
                                style={{ 
                                    backgroundColor: 'var(--listing-input-bg)', 
                                    border: '1px solid var(--listing-border)',
                                    color: 'var(--listing-text-primary)'
                                }}
                            />
                            <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--listing-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        
                        <div className="flex overflow-x-auto w-full justify-start sm:justify-end pb-2 sm:pb-0 scrollbar-hide gap-2">
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2.5 rounded-full text-sm font-light focus:outline-none appearance-none cursor-pointer shrink-0"
                                style={{ 
                                    backgroundColor: 'var(--listing-input-bg)', 
                                    border: '1px solid var(--listing-border)',
                                    color: 'var(--listing-text-primary)'
                                }}
                            >
                                <option value="recommended">Sort: Recommended</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                            </select>
                            
                            <select 
                                value={guestCount}
                                onChange={(e) => setGuestCount(e.target.value)}
                                className="px-4 py-2.5 rounded-full text-sm font-light focus:outline-none appearance-none cursor-pointer shrink-0"
                                style={{ 
                                    backgroundColor: 'var(--listing-input-bg)', 
                                    border: '1px solid var(--listing-border)',
                                    color: 'var(--listing-text-primary)'
                                }}
                            >
                                <option value="">Guests: Any</option>
                                <option value="2">2+ Guests</option>
                                <option value="4">4+ Guests</option>
                                <option value="6">6+ Guests</option>
                                <option value="10">10+ Guests</option>
                            </select>
                        </div>
                    </div>
                </motion.div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--listing-accent)', borderTopColor: 'transparent' }}></div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 mb-8">{error}</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                        <AnimatePresence mode="popLayout">
                            {filteredProperties.map((prop) => (
                                <motion.div
                                    layout
                                    key={prop._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.4 }}
                                    onClick={() => handleCardClick(prop)}
                                    className="group rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.12)] transition-all duration-300 border flex flex-col cursor-pointer transform hover:-translate-y-1"
                                    style={{ 
                                        backgroundColor: 'var(--listing-card-bg)', 
                                        borderColor: 'var(--listing-border)'
                                    }}
                                >
                                    <div className="h-56 sm:h-64 w-full bg-stone-200 relative overflow-hidden">
                                        {/* Property Type Badge */}
                                        <div 
                                            className="absolute top-4 left-4 z-10 px-3 py-1 backdrop-blur-sm rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm"
                                            style={{ 
                                                backgroundColor: 'var(--listing-badge-bg)', 
                                                color: 'var(--listing-badge-text)' 
                                            }}
                                        >
                                            {prop.type}
                                        </div>
                                        <img
                                            src={(typeof prop.coverImage === 'string' ? prop.coverImage : prop.coverImage?.url) || 'https://via.placeholder.com/600x400?text=No+Image'}
                                            alt={prop.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                    </div>

                                    <div className="p-6 sm:p-8 flex flex-col flex-grow">
                                        <div className="mb-2 flex justify-between items-start gap-4">
                                            <div>
                                                <h3 className="text-xl sm:text-2xl font-semibold leading-tight mb-1.5" style={{ color: 'var(--listing-text-primary)' }}>{prop.name}</h3>
                                                {prop.averageRating > 0 && (
                                                    <div className="flex items-center gap-1.5 text-sm text-[var(--listing-text-secondary)]">
                                                        <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                        <span className="font-medium text-[var(--listing-text-primary)]">{prop.averageRating}</span>
                                                        <span>({prop.reviewCount} reviews)</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="flex flex-col items-end">
                                                    {(() => {
                                                        const actualPrice = getActualPrice(prop) || 0;
                                                        if (actualPrice === 0) return <span className="text-lg sm:text-xl font-medium">Price Unavailable</span>;
                                                        
                                                        const originalPrice = calculateMRP(actualPrice);
                                                        const prefix = prop.type === 'campsite' ? <span className="text-sm font-medium mr-1 opacity-80" style={{ color: 'var(--listing-text-secondary)' }}>From</span> : null;
                                                        const originalPrefix = prop.type === 'campsite' ? 'From ' : '';

                                                        // Ensure original price is strictly greater, otherwise don't show discount
                                                        if (originalPrice <= actualPrice) {
                                                            return <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--listing-text-primary)' }}>{prefix}₹{actualPrice.toLocaleString('en-IN')}</span>;
                                                        }
                                                        
                                                        return (
                                                            <>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span className="text-xs sm:text-sm line-through opacity-60" style={{ color: 'var(--listing-text-secondary)' }}>{originalPrefix}₹{originalPrice.toLocaleString('en-IN')}</span>
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white bg-red-500 shadow-sm">{discountPercent}% OFF</span>
                                                                </div>
                                                                <span className="text-lg sm:text-xl font-bold" style={{ color: 'var(--listing-text-primary)' }}>{prefix}₹{actualPrice.toLocaleString('en-IN')}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <span className="block text-[10px] sm:text-xs font-light mt-0.5" style={{ color: 'var(--listing-text-secondary)' }}>per {prop.pricing?.pricePer}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-sm mb-4" style={{ color: 'var(--listing-text-secondary)' }}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {prop.googleMapsLink ? (
                                                <a href={prop.googleMapsLink} target="_blank" rel="noopener noreferrer" className="font-light hover:underline" onClick={(e) => e.stopPropagation()}>View on Map</a>
                                            ) : (
                                                <span className="font-light">{prop.address || 'Location on map'}</span>
                                            )}
                                        </div>

                                        <p className="font-light text-sm line-clamp-2 mb-6" style={{ color: 'var(--listing-text-secondary)' }}>
                                            {prop.shortDescription}
                                        </p>

                                        <div className="mt-auto pt-5 border-t flex items-center justify-between text-sm" style={{ borderColor: 'var(--listing-border)' }}>
                                            <div className="flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--listing-border)', color: 'var(--listing-text-secondary)' }}>
                                                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                Max {prop.maxGuests}
                                            </div>
                                            <div className="font-medium flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: 'var(--listing-accent)' }}>
                                                Explore
                                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
                {!isLoading && filteredProperties.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--listing-border)', color: 'var(--listing-text-secondary)' }}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium mb-1" style={{ color: 'var(--listing-text-primary)' }}>No properties found</h3>
                        <p className="font-light" style={{ color: 'var(--listing-text-secondary)' }}>Try adjusting your filters or search location.</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PropertiesListing;
