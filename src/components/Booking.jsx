import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Booking = () => {
    const [searchParams] = useSearchParams();
    const [properties, setProperties] = useState([]);
    const [availablePackages, setAvailablePackages] = useState([]);
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
        propertyId: '',
        checkIn: new Date().toISOString().split('T')[0],
        checkOut: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        packageType: '',
        guests: 1,
        vegCount: 1,
        nonVegCount: 0,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        botField: '' // Honeypot field for spam prevention
    });
    
    const [nights, setNights] = useState(0);
    const [calculatedPrice, setCalculatedPrice] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [whatsappNumber, setWhatsappNumber] = useState('919975526627');

    useEffect(() => {
        if (formData.checkIn && formData.checkOut) {
            const start = new Date(formData.checkIn);
            const end = new Date(formData.checkOut);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setNights(diffDays > 0 ? diffDays : 0);
            
            // Calculate price
            if (formData.propertyId && diffDays > 0) {
                const selectedProp = properties.find(p => p._id === formData.propertyId);
                let weekdayPrice = 0;
                let weekendPrice = 0;
                let perUnitMultiplier = 1; // 1 for property, guests for per-person

                if (selectedProp && selectedProp.type === 'villa') {
                    weekdayPrice = selectedProp.pricing?.weekdayPrice || 0;
                    weekendPrice = selectedProp.pricing?.weekendPrice || 0;
                } else if (formData.packageType && availablePackages.length > 0) {
                    const selectedPkg = availablePackages.find(p => p.title === formData.packageType);
                    if (selectedPkg) {
                        weekdayPrice = selectedPkg.weekdayPrice || 0;
                        weekendPrice = selectedPkg.weekendPrice || 0;
                        perUnitMultiplier = Number(formData.guests) || 1; // Assuming campsite packages are per person
                    }
                }

                let total = 0;
                let current = new Date(start);
                for (let i = 0; i < diffDays; i++) {
                    let day = current.getDay();
                    if (day === 0 || day === 6) {
                        total += weekendPrice;
                    } else {
                        total += weekdayPrice;
                    }
                    current.setDate(current.getDate() + 1);
                }
                setCalculatedPrice(total * perUnitMultiplier);
            } else {
                setCalculatedPrice(0);
            }
        } else {
            setNights(0);
            setCalculatedPrice(0);
        }
    }, [formData.checkIn, formData.checkOut, formData.propertyId, formData.packageType, formData.guests, properties, availablePackages]);

    // Fetch Properties
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/properties?isActive=true`);
                if (response.ok) {
                    const data = await response.json();
                    setProperties(data);
                }
            } catch (err) {
                console.error("Failed to load properties for booking form", err);
            }
        };
        fetchProperties();
    }, []);

    // Fetch Packages when Property changes (if it's a campsite)
    useEffect(() => {
        const fetchPackages = async () => {
            if (!formData.propertyId) {
                setAvailablePackages([]);
                return;
            }
            
            const selectedProp = properties.find(p => p._id === formData.propertyId);
            
            // If villa, no packages needed
            if (selectedProp && selectedProp.type === 'villa') {
                setAvailablePackages([]);
                setFormData(prev => ({ ...prev, packageType: 'Villa Stay' }));
                return;
            }

            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/packages?propertyId=${formData.propertyId}`);
                if (response.ok) {
                    const data = await response.json();
                    setAvailablePackages(data);
                    // Reset package type if current one isn't in the new list
                    if (!data.find(p => p.title === formData.packageType)) {
                        setFormData(prev => ({ ...prev, packageType: '' }));
                    }
                }
            } catch (err) {
                console.error("Failed to load packages for booking form", err);
            }
        };
        
        if (properties.length > 0) {
            fetchPackages();
        }
    }, [formData.propertyId, properties]);

    // Fetch WhatsApp number from settings API
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
                }
            } catch (err) {
                console.error('Failed to fetch WhatsApp settings', err);
            }
        };
        fetchSettings();
    }, []);

    // Theme switching based on property
    useEffect(() => {
        const selectedProp = properties.find(p => p._id === formData.propertyId);
        if (selectedProp && selectedProp.type === 'villa') {
            document.documentElement.setAttribute('data-theme', 'villa');
        } else {
            document.documentElement.setAttribute('data-theme', 'default');
        }
    }, [formData.propertyId, properties]);

    // Read query params for pre-selection
    useEffect(() => {
        const propIdParam = searchParams.get('propertyId');
        const pkgParam = searchParams.get('package');
        
        if (propIdParam) {
            setFormData(prev => ({ ...prev, propertyId: propIdParam }));
        }
        if (pkgParam) {
            setFormData(prev => ({ ...prev, packageType: pkgParam }));
        }
    }, [searchParams]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = (e) => {
        e.preventDefault();

        if (step === 1) {
            if (!formData.propertyId || !formData.checkIn || !formData.checkOut) return;
            
            const selectedProp = properties.find(p => p._id === formData.propertyId);
            if (selectedProp && selectedProp.type === 'campsite' && !formData.packageType) {
                alert("Please select a package.");
                return;
            }
            
            if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
                alert("Check-out date must be after check-in date");
                return;
            }
        }

        if (step === 2) {
            const selectedProp = properties.find(p => p._id === formData.propertyId);
            const totalGuests = Number(formData.guests);
            const totalFood = Number(formData.vegCount) + Number(formData.nonVegCount);

            if (totalGuests < 1) {
                alert("Minimum 1 guest is required");
                return;
            }
            if (selectedProp && selectedProp.type === 'campsite' && totalFood !== totalGuests) {
                alert(`Food count must exactly match the number of guests (${totalGuests}). You selected ${totalFood}.`);
                return;
            }
        }

        if (step < 3) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 1) {
            setStep(step - 1);
            setApiError(null);
        }
    };

    const handleConfirmBooking = async () => {
        setIsLoading(true);
        setApiError(null);

        const dominantFoodPreference = Number(formData.nonVegCount) > 0 ? 'Non-Veg' : 'Veg';
        const selectedProp = properties.find(p => p._id === formData.propertyId);

        const bookingPayload = {
            propertyId: formData.propertyId,
            packageType: formData.packageType,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guests: Number(formData.guests),
            vegGuests: selectedProp?.type === 'villa' ? 0 : Number(formData.vegCount),
            nonVegGuests: selectedProp?.type === 'villa' ? 0 : Number(formData.nonVegCount),
            foodPreference: selectedProp?.type === 'villa' ? 'N/A' : dominantFoodPreference,
            customerName: `${formData.firstName} ${formData.lastName}`,
            customerPhone: formData.phone,
            totalPrice: calculatedPrice,
            botField: formData.botField
        };

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save booking. Please try again.');
            }

            const propertyName = selectedProp ? selectedProp.name : 'Pawna';
            let message = `🏕️ *New Booking Request!* 🌟\n\n🏡 *Property:* ${propertyName}\n📦 *Package/Type:* ${formData.packageType}\n📅 *Dates:* ${formData.checkIn} to ${formData.checkOut}\n🌙 *Nights:* ${nights}\n\n👥 *Total Guests:* ${formData.guests}`;
            
            if (selectedProp?.type !== 'villa') {
                message += `\n🥗 *Veg:* ${formData.vegCount} | 🍗 *Non-Veg:* ${formData.nonVegCount}`;
            }
            
            message += `\n\n💰 *Total Price:* ₹${calculatedPrice.toLocaleString('en-IN')}\n\n👤 *Name:* ${formData.firstName} ${formData.lastName}\n📞 *Phone:* ${formData.phone}\n📧 *Email:* ${formData.email}\n\n✨ *Looking forward to an amazing stay!* ✨`;

            const encodedMessage = encodeURIComponent(message);
            // Use property specific WhatsApp if available, fallback to global
            const targetWhatsapp = (selectedProp && selectedProp.whatsappNumber) ? selectedProp.whatsappNumber : whatsappNumber;
            const whatsappUrl = `https://wa.me/${targetWhatsapp}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');

        } catch (error) {
            setApiError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedPropObj = properties.find(p => p._id === formData.propertyId);
    const isCampsite = selectedPropObj && selectedPropObj.type === 'campsite';

    return (
        <section id="booking" className="py-16 sm:py-24 md:py-32 bg-[var(--listing-bg)] px-4 sm:px-6 lg:px-8 transition-colors duration-500">
            <div className="max-w-3xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-8 sm:mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[var(--listing-text-primary)] mb-3 sm:mb-4 tracking-tight">Reserve Your Stay</h2>
                    <p className="text-[var(--listing-text-secondary)] font-light text-base sm:text-lg">Secure your spot in nature.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-[var(--listing-card-bg)] rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[var(--listing-border)]"
                >

                    <div className="flex justify-between items-center mb-8 sm:mb-12 relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-[var(--listing-border)] z-0"></div>
                        {[1, 2, 3].map((num) => (
                            <div key={num} className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors duration-300 ${step >= num ? 'bg-[var(--listing-accent)] text-white shadow-xl scale-110' : 'bg-[var(--listing-bg)] text-[var(--listing-text-secondary)] border border-[var(--listing-border)]'}`}>
                                    {num}
                                </div>
                                <span className={`text-[10px] sm:text-xs font-medium tracking-wide uppercase ${step >= num ? 'text-[var(--listing-text-primary)]' : 'text-[var(--listing-text-secondary)]'}`}>
                                    {num === 1 ? 'Details' : num === 2 ? 'Guests' : 'Confirm'}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="min-h-[300px]">
                        <AnimatePresence mode="wait">

                            {step === 1 && (
                                <motion.form
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4 sm:space-y-6"
                                    onSubmit={nextStep}
                                >
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Select Property</label>
                                        <div className="relative">
                                            <select name="propertyId" value={formData.propertyId} onChange={handleChange} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light appearance-none text-sm sm:text-base" required>
                                                <option value="" disabled>Choose a property...</option>
                                                {properties.map(prop => (
                                                    <option key={prop._id} value={prop._id}>{prop.name} ({prop.type})</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--listing-text-secondary)]">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {isCampsite && (
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Select Package</label>
                                            <div className="relative">
                                                <select name="packageType" value={formData.packageType} onChange={handleChange} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light appearance-none text-sm sm:text-base" required>
                                                    <option value="" disabled>Choose your experience...</option>
                                                    {availablePackages.map(pkg => (
                                                        <option key={pkg._id} value={pkg.title}>{pkg.title}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--listing-text-secondary)]">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Check-in Date</label>
                                            <input type="date" name="checkIn" min={new Date().toISOString().split('T')[0]} value={formData.checkIn} onChange={handleChange} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Check-out Date</label>
                                            <input type="date" name="checkOut" value={formData.checkOut} onChange={handleChange} min={formData.checkIn ? new Date(new Date(formData.checkIn).setDate(new Date(formData.checkIn).getDate() + 1)).toISOString().split('T')[0] : undefined} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                        </div>
                                    </div>

                                    {nights > 0 && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-[var(--listing-accent)]/5 rounded-xl flex items-center gap-3">
                                            <svg className="w-5 h-5 text-[var(--listing-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <div className="text-sm text-[var(--listing-text-secondary)] font-light">
                                                Duration of stay: <span className="font-medium text-[var(--listing-text-primary)]">{nights} night{nights > 1 ? 's' : ''}</span>
                                            </div>
                                        </motion.div>
                                    )}

                                    <button type="submit" className="w-full py-3.5 sm:py-4 mt-6 sm:mt-8 bg-[var(--listing-accent)] text-white rounded-xl text-xs sm:text-sm font-medium tracking-wide hover:opacity-90 transition-opacity active:scale-[0.98]">
                                        CONTINUE TO GUEST DETAILS
                                    </button>
                                </motion.form>
                            )}

                            {step === 2 && (
                                <motion.form
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4 sm:space-y-6"
                                    onSubmit={nextStep}
                                >
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Number of Guests</label>
                                        <input type="number" name="guests" min="1" max={selectedPropObj?.maxGuests || 100} value={formData.guests} onChange={handleChange} className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                    </div>

                                    {isCampsite && (
                                        <div className="grid grid-cols-2 gap-4 sm:gap-6 bg-[var(--listing-bg)] p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-[var(--listing-border)]">
                                            <div className="col-span-2 text-xs sm:text-sm text-[var(--listing-text-secondary)] font-medium mb-[-8px] sm:mb-[-12px]">Meal Preferences (Must total {formData.guests})</div>
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-xs sm:text-sm font-medium text-green-700">🥗 Veg Meals</label>
                                                <input type="number" name="vegCount" min="0" value={formData.vegCount} onChange={handleChange} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-[var(--listing-card-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                            </div>
                                            <div className="space-y-1.5 sm:space-y-2">
                                                <label className="text-xs sm:text-sm font-medium text-orange-700">🍗 Non-Veg Meals</label>
                                                <input type="number" name="nonVegCount" min="0" value={formData.nonVegCount} onChange={handleChange} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all bg-[var(--listing-card-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">First Name</label>
                                            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Last Name</label>
                                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Email Address</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                        </div>
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="text-xs sm:text-sm font-medium text-[var(--listing-text-primary)]">Phone Number</label>
                                            <input type="tel" name="phone" pattern="[0-9+\s-]{10,15}" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" className="w-full px-4 sm:px-5 py-3 sm:py-4 rounded-xl border border-[var(--listing-border)] focus:outline-none focus:ring-2 focus:ring-[var(--listing-accent)]/20 focus:border-[var(--listing-accent)] transition-all bg-[var(--listing-bg)] text-[var(--listing-text-primary)] font-light text-sm sm:text-base" required />
                                        </div>
                                    </div>
                                    
                                    {/* Honeypot field (invisible to users) */}
                                    <input type="text" name="botField" value={formData.botField} onChange={handleChange} style={{ display: 'none' }} tabIndex="-1" autoComplete="off" />

                                    <div className="flex gap-3 sm:gap-4 mt-6 sm:mt-8">
                                        <button type="button" onClick={prevStep} className="w-1/3 py-3.5 sm:py-4 border border-[var(--listing-border)] text-[var(--listing-text-primary)] rounded-xl text-xs sm:text-sm font-medium tracking-wide hover:bg-[var(--listing-bg)] transition-colors active:scale-[0.98]">
                                            BACK
                                        </button>
                                        <button type="submit" className="w-2/3 py-3.5 sm:py-4 bg-[var(--listing-accent)] text-white rounded-xl text-xs sm:text-sm font-medium tracking-wide hover:opacity-90 transition-opacity hover:shadow-xl active:scale-[0.98]">
                                            REVIEW BOOKING
                                        </button>
                                    </div>
                                </motion.form>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="text-center py-4"
                                >
                                    <div className="w-20 h-20 bg-[var(--listing-accent)]/10 text-[var(--listing-accent)] rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-medium text-[var(--listing-text-primary)] mb-2">You're almost there!</h3>
                                    <p className="text-[var(--listing-text-secondary)] font-light mb-8 max-w-sm mx-auto">
                                        Please review your details carefully before confirming your stay.
                                    </p>

                                    <div className="px-4 sm:px-6 py-5 sm:py-8 bg-[var(--listing-bg)]/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl text-left space-y-4 sm:space-y-5 mb-8 sm:mb-10 border border-[var(--listing-border)] shadow-sm">
                                        <div className="flex items-center justify-between border-b border-[var(--listing-border)] pb-5">
                                            <span className="text-sm font-medium text-[var(--listing-text-secondary)] flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> Property</span>
                                            <span className="text-sm text-[var(--listing-text-primary)] font-medium">{selectedPropObj ? selectedPropObj.name : 'Unknown'}</span>
                                        </div>
                                        {isCampsite && (
                                            <div className="flex items-center justify-between border-b border-[var(--listing-border)] pb-5">
                                                <span className="text-sm font-medium text-[var(--listing-text-secondary)] flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> Package</span>
                                                <span className="text-sm text-[var(--listing-text-primary)] font-medium">{formData.packageType}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between border-b border-[var(--listing-border)] pb-5">
                                            <span className="text-sm font-medium text-[var(--listing-text-secondary)] flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Dates</span>
                                            <span className="text-sm text-[var(--listing-text-primary)] font-medium">{formData.checkIn} to {formData.checkOut}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-[var(--listing-border)] pb-5">
                                            <span className="text-sm font-medium text-[var(--listing-text-secondary)] flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> Duration</span>
                                            <span className="text-sm text-[var(--listing-text-primary)] font-medium">{nights} Night{nights > 1 ? 's' : ''}</span>
                                        </div>
                                        {calculatedPrice > 0 && (
                                            <div className="flex items-center justify-between border-b border-[var(--listing-border)] pb-5">
                                                <span className="text-sm font-medium text-[var(--listing-text-secondary)] flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Total Price</span>
                                                <span className="text-sm text-[var(--listing-text-primary)] font-medium text-emerald-600">₹{calculatedPrice.toLocaleString('en-IN')}</span>
                                            </div>
                                        )}
                                        {isCampsite && (
                                            <div className="flex items-center justify-between border-b border-[var(--listing-border)] pb-5">
                                                <span className="text-sm font-medium text-[var(--listing-text-secondary)] flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> Meals ({formData.guests})</span>
                                                <span className="text-sm text-[var(--listing-text-primary)] font-medium">{formData.vegCount} Veg, {formData.nonVegCount} Non-Veg</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-[var(--listing-text-secondary)] flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Primary Guest</span>
                                            <span className="text-sm text-[var(--listing-text-primary)] font-medium text-right">{formData.firstName} {formData.lastName}<br /><span className="text-xs text-[var(--listing-text-secondary)] font-normal">{formData.phone}</span></span>
                                        </div>
                                    </div>

                                    {apiError && (
                                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-left">
                                            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-red-700 font-medium">{apiError}</span>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 sm:gap-4">
                                        <p className="text-[11px] text-[var(--listing-text-secondary)] text-center leading-tight">
                                            This will redirect you to WhatsApp after form filling. You are not being charged yet.
                                        </p>
                                        <div className="flex gap-3 sm:gap-4">
                                            <button disabled={isLoading} type="button" onClick={prevStep} className="w-1/3 py-3.5 sm:py-4 border border-[var(--listing-border)] text-[var(--listing-text-primary)] rounded-xl text-xs sm:text-sm font-medium tracking-wide hover:bg-[var(--listing-bg)] transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                                EDIT
                                            </button>
                                            <button disabled={isLoading} type="button" onClick={handleConfirmBooking} className="w-2/3 py-3.5 sm:py-4 bg-[#25D366] text-white rounded-xl text-xs sm:text-sm font-medium tracking-wide hover:bg-[#1DA851] transition-all hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
                                                {isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.474-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                                        </svg>
                                                        RESERVE ON WHATSAPP
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </motion.div>

            </div>
        </section>
    );
};

export default Booking;
