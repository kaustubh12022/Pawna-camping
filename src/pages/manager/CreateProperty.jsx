import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ImageUploader from '../../components/manager/ImageUploader';

const API = import.meta.env.VITE_API_URL || '';

const CreateProperty = () => {
    const { id } = useParams();
    const isEditMode = !!id;
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '', type: 'campsite', location: '', googleMapsLink: '', address: '',
        shortDescription: '', description: '',
        basePrice: '', discountPrice: '', pricePer: 'night',
        maxGuests: 10, checkInTime: '2:00 PM', checkOutTime: '11:00 AM',
        whatsappNumber: '', isActive: true
    });

    const [amenityInput, setAmenityInput] = useState('');
    const [amenities, setAmenities] = useState([]);
    
    const [ruleInput, setRuleInput] = useState('');
    const [rules, setRules] = useState([]);

    const [images, setImages] = useState([]);
    const [coverImage, setCoverImage] = useState({ url: '', publicId: '' });

    useEffect(() => {
        if (isEditMode) {
            const fetchProperty = async () => {
                try {
                    const token = localStorage.getItem('managerToken');
                    const res = await fetch(`${API}/api/properties/id/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (!res.ok) throw new Error('Failed to fetch property');
                    const data = await res.json();
                    
                    setFormData({
                        name: data.name || '',
                        type: data.type || 'campsite',
                        location: data.location || '',
                        googleMapsLink: data.googleMapsLink || '',
                        address: data.address || '',
                        shortDescription: data.shortDescription || '',
                        description: data.description || '',
                        basePrice: data.pricing?.basePrice || '',
                        discountPrice: data.pricing?.discountPrice || '',
                        pricePer: data.pricing?.pricePer || 'night',
                        maxGuests: data.maxGuests || 10,
                        checkInTime: data.checkInTime || '2:00 PM',
                        checkOutTime: data.checkOutTime || '11:00 AM',
                        whatsappNumber: data.whatsappNumber || '',
                        isActive: data.isActive ?? true
                    });
                    
                    setAmenities(data.amenities || []);
                    setRules(data.rules || []);
                    
                    // Handle legacy image format (strings) vs new format (objects)
                    const parsedImages = (data.images || []).map((img, i) => {
                        if (typeof img === 'string') return { url: img, publicId: '', description: '', order: i };
                        return img;
                    });
                    setImages(parsedImages);
                    
                    if (data.coverImage) {
                        if (typeof data.coverImage === 'string') {
                            setCoverImage({ url: data.coverImage, publicId: '' });
                        } else {
                            setCoverImage(data.coverImage);
                        }
                    }

                } catch (err) {
                    setError('Error loading property: ' + err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProperty();
        }
    }, [id, isEditMode]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddTag = (e, type) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (type === 'amenity' && amenityInput.trim()) {
                if (!amenities.includes(amenityInput.trim())) {
                    setAmenities([...amenities, amenityInput.trim()]);
                }
                setAmenityInput('');
            } else if (type === 'rule' && ruleInput.trim()) {
                if (!rules.includes(ruleInput.trim())) {
                    setRules([...rules, ruleInput.trim()]);
                }
                setRuleInput('');
            }
        }
    };

    const removeTag = (type, index) => {
        if (type === 'amenity') {
            setAmenities(amenities.filter((_, i) => i !== index));
        } else {
            setRules(rules.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');

        // Automatically append pending input tags to prevent data loss
        let finalAmenities = [...amenities];
        if (amenityInput.trim() && !finalAmenities.includes(amenityInput.trim())) {
            finalAmenities.push(amenityInput.trim());
            setAmenities(finalAmenities);
            setAmenityInput('');
        }

        let finalRules = [...rules];
        if (ruleInput.trim() && !finalRules.includes(ruleInput.trim())) {
            finalRules.push(ruleInput.trim());
            setRules(finalRules);
            setRuleInput('');
        }

        const payload = {
            name: formData.name,
            type: formData.type,
            location: formData.location,
            googleMapsLink: formData.googleMapsLink,
            address: formData.address,
            shortDescription: formData.shortDescription,
            description: formData.description,
            pricing: {
                basePrice: Number(formData.basePrice),
                discountPrice: formData.discountPrice ? Number(formData.discountPrice) : null,
                pricePer: formData.pricePer,
                priceDisplay: formData.basePrice ? `₹${Number(formData.basePrice).toLocaleString('en-IN')}` : ''
            },
            maxGuests: Number(formData.maxGuests),
            checkInTime: formData.checkInTime,
            checkOutTime: formData.checkOutTime,
            whatsappNumber: formData.whatsappNumber,
            isActive: formData.isActive,
            amenities: finalAmenities,
            rules: finalRules,
            images,
            coverImage
        };

        try {
            const token = localStorage.getItem('managerToken');
            const url = isEditMode 
                ? `${API}/api/properties/${id}`
                : `${API}/api/properties`;
            
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to save property');
            }

            navigate('/manager/properties'); // Back to property list
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div></div>;
    }

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/manager/properties')} className="text-stone-500 hover:text-stone-900 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <h1 className="text-xl font-bold text-stone-900">{isEditMode ? 'Edit Property' : 'Add New Property'}</h1>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => navigate('/manager/properties')} className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 text-sm font-bold text-white bg-[#25D366] rounded-lg hover:bg-[#20bd5a] transition-colors disabled:opacity-70 flex items-center gap-2">
                            {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                            {isSaving ? 'Saving...' : 'Save Property'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-white rounded-2xl border shadow-sm p-8 space-y-12">
                    
                    {/* BASIC INFO */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-stone-800 border-b pb-2">Basic Info</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Property Name <span className="text-red-500">*</span></label>
                                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all" placeholder="e.g. Lakeside Bliss Tent" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Property Type <span className="text-red-500">*</span></label>
                                <select name="type" value={formData.type} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all">
                                    <option value="campsite">Campsite</option>
                                    <option value="villa">Villa</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Google Maps Link</label>
                                <input type="text" name="googleMapsLink" value={formData.googleMapsLink} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all" placeholder="e.g. https://maps.app.goo.gl/..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Location / Village</label>
                                <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all" placeholder="e.g. Pawna Lake" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Full Address</label>
                                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all" placeholder="e.g. Plot 45, Near Pawna Dam, Lonavala" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Property WhatsApp Number</label>
                            <input type="text" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition-all" placeholder="Leave blank to use global setting" />
                            <p className="text-xs text-stone-500 mt-1">Include country code (e.g. 919876543210)</p>
                        </div>
                        <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                            <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleInputChange} className="w-5 h-5 text-[#25D366] rounded border-stone-300 focus:ring-[#25D366]" />
                            <label htmlFor="isActive" className="text-sm font-medium text-stone-700">Property is active and visible to customers</label>
                        </div>
                    </section>

                    {/* DETAILS & AMENITIES */}
                    <section className="space-y-6 pt-6">
                        <h2 className="text-xl font-bold text-stone-800 border-b pb-2">Details & Amenities</h2>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Short Description (for cards)</label>
                            <textarea name="shortDescription" value={formData.shortDescription} onChange={handleInputChange} rows="2" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" placeholder="A brief 1-2 line summary..."></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Full Description</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} rows="6" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" placeholder="Detailed description of the property, experience, and surroundings..."></textarea>
                        </div>
                        
                        <div className="pt-4">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Amenities</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {amenities.map((amenity, index) => (
                                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 border border-stone-200 rounded-full text-sm text-stone-700">
                                        {amenity}
                                        <button onClick={() => removeTag('amenity', index)} className="hover:text-red-500 focus:outline-none">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2 w-full md:w-2/3">
                                <input 
                                    type="text" 
                                    value={amenityInput} 
                                    onChange={(e) => setAmenityInput(e.target.value)} 
                                    onKeyDown={(e) => handleAddTag(e, 'amenity')}
                                    className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" 
                                    placeholder="Type amenity (e.g. WiFi, Pool)" 
                                />
                                <button 
                                    type="button"
                                    onClick={(e) => handleAddTag({ key: 'Enter', preventDefault: () => {} }, 'amenity')}
                                    className="px-6 py-3 bg-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-300 transition-colors shrink-0 active:scale-95"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* PRICING & RULES */}
                    <section className="space-y-6 pt-6">
                        <h2 className="text-xl font-bold text-stone-800 border-b pb-2">Pricing & Rules</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Base Price (₹) <span className="text-red-500">*</span></label>
                                <input type="number" name="basePrice" value={formData.basePrice} onChange={handleInputChange} required className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" placeholder="e.g. 2000" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Discount Price (₹)</label>
                                <input type="number" name="discountPrice" value={formData.discountPrice} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" placeholder="e.g. 1500 (optional)" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Price Per</label>
                                <select name="pricePer" value={formData.pricePer} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all">
                                    <option value="night">Per Night</option>
                                    <option value="person">Per Person</option>
                                    <option value="tent">Per Tent</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-stone-100">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Max Guests</label>
                                <input type="number" name="maxGuests" value={formData.maxGuests} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Check-in Time</label>
                                <input type="text" name="checkInTime" value={formData.checkInTime} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" placeholder="e.g. 2:00 PM" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">Check-out Time</label>
                                <input type="text" name="checkOutTime" value={formData.checkOutTime} onChange={handleInputChange} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" placeholder="e.g. 11:00 AM" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-stone-100">
                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">House Rules</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {rules.map((rule, index) => (
                                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 border border-stone-200 rounded-full text-sm text-stone-700">
                                        {rule}
                                        <button onClick={() => removeTag('rule', index)} className="hover:text-red-500 focus:outline-none">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2 w-full md:w-2/3">
                                <input 
                                    type="text" 
                                    value={ruleInput} 
                                    onChange={(e) => setRuleInput(e.target.value)} 
                                    onKeyDown={(e) => handleAddTag(e, 'rule')}
                                    className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#25D366] outline-none transition-all" 
                                    placeholder="Type rule (e.g. No loud music after 10PM)" 
                                />
                                <button 
                                    type="button"
                                    onClick={(e) => handleAddTag({ key: 'Enter', preventDefault: () => {} }, 'rule')}
                                    className="px-6 py-3 bg-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-300 transition-colors shrink-0 active:scale-95"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* MEDIA */}
                    <section className="space-y-6 pt-6">
                        <h2 className="text-xl font-bold text-stone-800 border-b pb-2">Images & Media</h2>
                        <ImageUploader 
                            images={images} 
                            setImages={setImages} 
                            coverImage={coverImage} 
                            setCoverImage={setCoverImage} 
                        />
                    </section>

                </div>
                
                <div className="mt-8 flex justify-end">
                    <button onClick={handleSubmit} disabled={isSaving} className="px-8 py-3 text-sm font-bold text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-70 shadow-lg flex items-center gap-2">
                        {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {isSaving ? 'Saving Property...' : 'Save & Publish Property'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateProperty;
