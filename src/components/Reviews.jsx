import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const Reviews = ({ propertyId }) => {
    const [reviews, setReviews] = useState([]);
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    const [formData, setFormData] = useState({
        property: propertyId || '',
        reviewerName: '',
        reviewerEmail: '',
        reviewerPhone: '',
        rating: 5,
        text: ''
    });

    useEffect(() => {
        fetchReviews();
        if (!propertyId) fetchProperties();
    }, [propertyId]);

    const fetchReviews = async () => {
        try {
            const url = propertyId ? `${API}/api/reviews/${propertyId}` : `${API}/api/reviews`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setReviews(propertyId ? data : data.slice(0, 6)); // Show top 6 recent approved reviews on home, all on property details
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProperties = async () => {
        try {
            const res = await fetch(`${API}/api/properties?isActive=true`);
            if (res.ok) {
                const data = await res.json();
                setProperties(data.data || data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/api/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert("Review submitted successfully! It will appear once approved.");
                setShowForm(false);
                setFormData({ property: propertyId || '', reviewerName: '', reviewerEmail: '', reviewerPhone: '', rating: 5, text: '' });
            } else {
                const d = await res.json();
                alert(d.message || "Failed to submit review");
            }
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <section className="py-16 sm:py-24 bg-[var(--listing-bg)] border-b border-[var(--listing-border)] transition-colors duration-500" id="reviews">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12 sm:mb-16 flex flex-col items-center"
                >
                    <h2 className="text-3xl sm:text-4xl font-semibold text-[var(--listing-text-primary)] mb-4 tracking-tight transition-colors duration-500">Guest Experiences</h2>
                    <p className="text-[var(--listing-text-secondary)] text-base sm:text-lg font-light mb-8 transition-colors duration-500">See what our guests have to say about their stay.</p>
                    <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-[var(--listing-accent)] text-white font-medium rounded-full hover:opacity-90 transition-opacity">
                        Write a Review
                    </button>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                    {!isLoading && reviews.length === 0 && (
                        <div className="col-span-full text-center text-[var(--listing-text-secondary)]">No reviews yet. Be the first!</div>
                    )}
                    {reviews.map((review, idx) => (
                        <motion.div 
                            key={review._id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="bg-[var(--listing-card-bg)] p-6 sm:p-8 rounded-3xl shadow-sm border border-[var(--listing-border)] hover:shadow-md transition-all duration-500"
                        >
                            <div className="flex gap-1 mb-4 text-[var(--listing-accent)] transition-colors duration-500">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-current' : 'text-[var(--listing-border)]'}`} viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-[var(--listing-text-secondary)] font-light leading-relaxed mb-6 transition-colors duration-500">"{review.text}"</p>
                            <div className="flex justify-between items-end border-t border-[var(--listing-border)] pt-4 transition-colors duration-500">
                                <div>
                                    <h4 className="font-medium text-[var(--listing-text-primary)] transition-colors duration-500">{review.reviewerName}</h4>
                                    <span className="text-xs text-[var(--listing-text-secondary)] opacity-80 block transition-colors duration-500">
                                        {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                {review.property && (
                                    <span className="text-xs font-medium text-[var(--listing-accent)] bg-[var(--listing-accent)]/10 px-2 py-1 rounded-full transition-colors duration-500 truncate max-w-[120px]">
                                        {review.property.name}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                <AnimatePresence>
                    {showForm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="relative bg-[var(--listing-bg)] rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-[var(--listing-border)] max-h-[90vh] overflow-y-auto"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-semibold text-[var(--listing-text-primary)]">Write a Review</h3>
                                    <button onClick={() => setShowForm(false)} className="p-2 text-[var(--listing-text-secondary)] hover:bg-[var(--listing-card-bg)] rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {!propertyId && (
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--listing-text-primary)] mb-1">Select Property *</label>
                                            <select required value={formData.property} onChange={e => setFormData({...formData, property: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--listing-card-bg)] border border-[var(--listing-border)] text-[var(--listing-text-primary)] focus:outline-none focus:border-[var(--listing-accent)]">
                                                <option value="" disabled>Select a property</option>
                                                {properties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--listing-text-primary)] mb-1">Your Name *</label>
                                        <input type="text" required maxLength={80} value={formData.reviewerName} onChange={e => setFormData({...formData, reviewerName: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--listing-card-bg)] border border-[var(--listing-border)] text-[var(--listing-text-primary)] focus:outline-none focus:border-[var(--listing-accent)]" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--listing-text-primary)] mb-1">Email (Optional)</label>
                                            <input type="email" value={formData.reviewerEmail} onChange={e => setFormData({...formData, reviewerEmail: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--listing-card-bg)] border border-[var(--listing-border)] text-[var(--listing-text-primary)] focus:outline-none focus:border-[var(--listing-accent)]" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--listing-text-primary)] mb-1">Phone (Optional)</label>
                                            <input type="tel" value={formData.reviewerPhone} onChange={e => setFormData({...formData, reviewerPhone: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--listing-card-bg)] border border-[var(--listing-border)] text-[var(--listing-text-primary)] focus:outline-none focus:border-[var(--listing-accent)]" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--listing-text-primary)] mb-1">Rating *</label>
                                        <div className="flex gap-2">
                                            {[1,2,3,4,5].map(star => (
                                                <button type="button" key={star} onClick={() => setFormData({...formData, rating: star})} className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${formData.rating >= star ? 'bg-[var(--listing-accent)] text-white' : 'bg-[var(--listing-card-bg)] text-[var(--listing-text-secondary)] border border-[var(--listing-border)]'}`}>
                                                    ★
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--listing-text-primary)] mb-1">Review *</label>
                                        <textarea required maxLength={1000} rows={4} value={formData.text} onChange={e => setFormData({...formData, text: e.target.value})} className="w-full p-3 rounded-xl bg-[var(--listing-card-bg)] border border-[var(--listing-border)] text-[var(--listing-text-primary)] focus:outline-none focus:border-[var(--listing-accent)] resize-none" placeholder="Share your experience..."></textarea>
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-[var(--listing-accent)] text-white font-medium rounded-xl hover:opacity-90 transition-opacity mt-4">
                                        Submit Review
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default Reviews;
