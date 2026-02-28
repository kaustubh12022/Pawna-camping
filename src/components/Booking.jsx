import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const packageNames = {
    normal: 'Normal Tent',
    cottage: 'Cottage', // ALIGNED EXACTLY WITH BACKEND ENUM
    luxury: 'Luxury Cottage'
};

const Booking = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        checkIn: '',
        checkOut: '',
        packageType: '',
        guests: 1,
        vegCount: 1,
        nonVegCount: 0,
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });
    const [nights, setNights] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState(null);

    useEffect(() => {
        if (formData.checkIn && formData.checkOut) {
            const start = new Date(formData.checkIn);
            const end = new Date(formData.checkOut);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setNights(diffDays > 0 ? diffDays : 0);
        } else {
            setNights(0);
        }
    }, [formData.checkIn, formData.checkOut]);

    useEffect(() => {
        const handleSelectPackage = (e) => {
            setFormData(prev => ({ ...prev, packageType: e.detail }));
            setStep(1);
        };
        window.addEventListener('selectPackage', handleSelectPackage);
        return () => window.removeEventListener('selectPackage', handleSelectPackage);
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const nextStep = (e) => {
        e.preventDefault();

        if (step === 1) {
            if (!formData.checkIn || !formData.checkOut || !formData.packageType) return;
            if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
                alert("Check-out date must be after check-in date");
                return;
            }
        }

        if (step === 2) {
            const totalGuests = Number(formData.guests);
            const totalFood = Number(formData.vegCount) + Number(formData.nonVegCount);

            if (totalGuests < 1) {
                alert("Minimum 1 guest is required");
                return;
            }
            if (totalFood !== totalGuests) {
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

        // PREPARE PAYLOAD FOR BACKEND
        // Note: The schema currently accepts a single String ('Veg' or 'Non-Veg') for the whole booking.
        // To be statistically accurate for the Owner, we should evaluate the dominant preference,
        // or prioritize the presence of Non-Veg.
        const dominantFoodPreference = Number(formData.nonVegCount) > 0 ? 'Non-Veg' : 'Veg';

        const bookingPayload = {
            packageType: packageNames[formData.packageType],
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guests: Number(formData.guests),
            vegGuests: Number(formData.vegCount),
            nonVegGuests: Number(formData.nonVegCount),
            foodPreference: dominantFoodPreference,
            customerName: `${formData.firstName} ${formData.lastName}`,
            customerPhone: formData.phone
        };

        try {
            // ==========================================
            // API CALL SECTION (PUBLIC ANONYMOUS)
            // ==========================================
            console.log("🚀 SENDING BOOKING PAYLOAD:", JSON.stringify(bookingPayload, null, 2));

            const response = await fetch('http://localhost:5000/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingPayload)
            });

            // ==========================================
            // ERROR HANDLING
            // ==========================================
            if (!response.ok) {
                const errorData = await response.json();
                console.error("❌ BACKEND ERROR:", errorData);
                throw new Error(errorData.message || 'Failed to save booking. Please try again.');
            }

            // SUCCESS! 
            // const data = await response.json();

            // ==========================================
            // WHATSAPP REDIRECT SECTION
            // ==========================================
            const message = `🏕️ *New Booking Request!* 🌟\n\n📦 *Package:* ${packageNames[formData.packageType]}\n📅 *Dates:* ${formData.checkIn} to ${formData.checkOut}\n🌙 *Nights:* ${nights}\n\n👥 *Total Guests:* ${formData.guests}\n🥗 *Veg:* ${formData.vegCount} | 🍗 *Non-Veg:* ${formData.nonVegCount}\n\n👤 *Name:* ${formData.firstName} ${formData.lastName}\n📞 *Phone:* ${formData.phone}\n📧 *Email:* ${formData.email}\n\n✨ *Looking forward to an amazing stay!* ✨`;

            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/919975526627?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');

        } catch (error) {
            setApiError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section id="booking" className="py-24 md:py-32 bg-[#fafafa] px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-4 tracking-tight">Reserve Your Stay</h2>
                    <p className="text-stone-500 font-light text-lg">Secure your spot in nature.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100"
                >

                    <div className="flex justify-between items-center mb-12 relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-stone-100 z-0"></div>
                        {[1, 2, 3].map((num) => (
                            <div key={num} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300 ${step >= num ? 'bg-stone-900 text-white shadow-xl scale-110' : 'bg-stone-100 text-stone-400'}`}>
                                    {num}
                                </div>
                                <span className={`text-xs font-medium tracking-wide uppercase hidden sm:block ${step >= num ? 'text-stone-900' : 'text-stone-400'}`}>
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
                                    className="space-y-6"
                                    onSubmit={nextStep}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">Check-in Date</label>
                                            <input type="date" name="checkIn" value={formData.checkIn} onChange={handleChange} className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">Check-out Date</label>
                                            <input type="date" name="checkOut" value={formData.checkOut} onChange={handleChange} min={formData.checkIn ? new Date(new Date(formData.checkIn).setDate(new Date(formData.checkIn).getDate() + 1)).toISOString().split('T')[0] : undefined} className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light" required />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-stone-700">Select Package</label>
                                        <div className="relative">
                                            <select name="packageType" value={formData.packageType} onChange={handleChange} className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light appearance-none" required>
                                                <option value="" disabled>Choose your experience...</option>
                                                <option value="normal">Normal Tent</option>
                                                <option value="cottage">Cozy Cottage</option>
                                                <option value="luxury">Luxury Cottage</option>
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {nights > 0 && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-stone-100/50 rounded-xl flex items-center gap-3">
                                            <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <div className="text-sm text-stone-600 font-light">
                                                Duration of stay: <span className="font-medium text-stone-900">{nights} night{nights > 1 ? 's' : ''}</span>
                                            </div>
                                        </motion.div>
                                    )}

                                    <button type="submit" className="w-full py-4 mt-8 bg-stone-900 text-white rounded-xl text-sm font-medium tracking-wide hover:bg-stone-800 transition-all hover:shadow-xl active:scale-[0.98]">
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
                                    className="space-y-6"
                                    onSubmit={nextStep}
                                >
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-stone-700">Number of Guests</label>
                                        <input type="number" name="guests" min="1" value={formData.guests} onChange={handleChange} className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light" required />
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-2 gap-6 bg-stone-50/50 p-6 rounded-2xl border border-stone-100">
                                        <div className="col-span-2 text-sm text-stone-500 font-medium mb-[-12px]">Meal Preferences (Must total {formData.guests})</div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-green-700">🥗 Veg Meals</label>
                                            <input type="number" name="vegCount" min="0" value={formData.vegCount} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all bg-white font-light" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-orange-700">🍗 Non-Veg Meals</label>
                                            <input type="number" name="nonVegCount" min="0" value={formData.nonVegCount} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all bg-white font-light" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">First Name</label>
                                            <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">Last Name</label>
                                            <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">Email Address</label>
                                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-stone-700">Phone Number</label>
                                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" className="w-full px-5 py-4 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-all bg-stone-50/50 hover:bg-stone-50 font-light" required />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-8">
                                        <button type="button" onClick={prevStep} className="w-1/3 py-4 border border-stone-200 text-stone-900 rounded-xl text-sm font-medium tracking-wide hover:bg-stone-50 transition-colors active:scale-[0.98]">
                                            BACK
                                        </button>
                                        <button type="submit" className="w-2/3 py-4 bg-stone-900 text-white rounded-xl text-sm font-medium tracking-wide hover:bg-stone-800 transition-all hover:shadow-xl active:scale-[0.98]">
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
                                    <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-2xl font-medium text-stone-900 mb-2">You're almost there!</h3>
                                    <p className="text-stone-500 font-light mb-8 max-w-sm mx-auto">
                                        Please review your details carefully before confirming your stay.
                                    </p>

                                    <div className="px-6 py-8 bg-stone-50/80 backdrop-blur-sm rounded-3xl text-left space-y-5 mb-10 border border-stone-100 shadow-sm">
                                        <div className="flex items-center justify-between border-b border-stone-200/60 pb-5">
                                            <span className="text-sm font-medium text-stone-500 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> Package</span>
                                            <span className="text-sm text-stone-900 font-medium">{packageNames[formData.packageType]}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-stone-200/60 pb-5">
                                            <span className="text-sm font-medium text-stone-500 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Dates</span>
                                            <span className="text-sm text-stone-900 font-medium">{formData.checkIn} to {formData.checkOut}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-stone-200/60 pb-5">
                                            <span className="text-sm font-medium text-stone-500 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> Duration</span>
                                            <span className="text-sm text-stone-900 font-medium">{nights} Night{nights > 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-stone-200/60 pb-5">
                                            <span className="text-sm font-medium text-stone-500 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> Meals ({formData.guests})</span>
                                            <span className="text-sm text-stone-900 font-medium">{formData.vegCount} Veg, {formData.nonVegCount} Non-Veg</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-stone-500 flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Primary Guest</span>
                                            <span className="text-sm text-stone-900 font-medium text-right">{formData.firstName} {formData.lastName}<br /><span className="text-xs text-stone-500 font-normal">{formData.phone}</span></span>
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

                                    <div className="flex gap-4">
                                        <button disabled={isLoading} type="button" onClick={prevStep} className="w-1/3 py-4 border border-stone-200 text-stone-900 rounded-xl text-sm font-medium tracking-wide hover:bg-stone-50 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                            EDIT
                                        </button>
                                        <button disabled={isLoading} type="button" onClick={handleConfirmBooking} className="w-2/3 py-4 bg-[#25D366] text-white rounded-xl text-sm font-medium tracking-wide hover:bg-[#1DA851] transition-all hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none">
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
