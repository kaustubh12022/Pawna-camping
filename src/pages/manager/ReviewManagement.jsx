import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Check, Trash2, Clock, CheckCircle, MessageSquare } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const ReviewManagement = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingReviews, setPendingReviews] = useState([]);
    const [approvedReviews, setApprovedReviews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const token = () => localStorage.getItem('managerToken');
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

    // Fetch pending reviews
    const fetchPending = async () => {
        try {
            const res = await fetch(`${API}/api/reviews/pending`, { headers: headers() });
            if (res.status === 401) return navigate('/manager/login');
            if (res.ok) setPendingReviews(await res.json());
        } catch (err) { console.error('Failed to fetch pending reviews', err); }
    };

    // Fetch approved reviews
    const fetchApproved = async () => {
        try {
            const res = await fetch(`${API}/api/reviews`, { headers: headers() });
            if (res.ok) setApprovedReviews(await res.json());
        } catch (err) { console.error('Failed to fetch approved reviews', err); }
    };

    useEffect(() => {
        if (!token()) return navigate('/manager/login');
        const load = async () => {
            setIsLoading(true);
            await Promise.all([fetchPending(), fetchApproved()]);
            setIsLoading(false);
        };
        load();
    }, []);

    const handleApprove = async (id) => {
        try {
            const res = await fetch(`${API}/api/reviews/${id}/approve`, {
                method: 'PATCH', headers: headers()
            });
            if (res.ok) {
                const approved = await res.json();
                setPendingReviews(prev => prev.filter(r => r._id !== id));
                setApprovedReviews(prev => [approved, ...prev]);
            }
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this review permanently?')) return;
        try {
            const res = await fetch(`${API}/api/reviews/${id}`, {
                method: 'DELETE', headers: headers()
            });
            if (res.ok) {
                setPendingReviews(prev => prev.filter(r => r._id !== id));
                setApprovedReviews(prev => prev.filter(r => r._id !== id));
            }
        } catch (err) { console.error(err); }
    };

    const renderStars = (rating) => (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className={`w-3.5 h-3.5 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`} />
            ))}
        </div>
    );

    const ReviewCard = ({ review, showActions }) => (
        <div className="bg-white rounded-2xl border border-stone-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-emerald-700">
                                {review.reviewerName?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate">{review.reviewerName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                {renderStars(review.rating)}
                                <span className="text-[11px] text-stone-400">
                                    {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-stone-600 leading-relaxed mt-3">{review.text}</p>

                    {review.property && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 rounded-lg">
                            <span className="text-[11px] font-medium text-stone-500">
                                {review.property.name} • {review.property.type}
                            </span>
                        </div>
                    )}
                </div>

                {showActions && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => handleApprove(review._id)}
                            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Approve Review"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDelete(review._id)}
                            className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Delete Review"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {!showActions && (
                    <button
                        onClick={() => handleDelete(review._id)}
                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex-shrink-0"
                        title="Delete Review"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900">Reviews</h1>
                    <p className="text-stone-500 text-sm mt-1">Moderate customer reviews before they appear publicly</p>
                </div>

                {pendingReviews.length > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-700">{pendingReviews.length} pending</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex bg-stone-100 p-1 rounded-xl w-fit gap-1">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    <Clock className="w-4 h-4" />
                    Pending ({pendingReviews.length})
                </button>
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'approved' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    <CheckCircle className="w-4 h-4" />
                    Approved ({approvedReviews.length})
                </button>
            </div>

            {/* Pending Reviews */}
            {activeTab === 'pending' && (
                <div className="space-y-3">
                    {pendingReviews.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
                            <CheckCircle className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-stone-900">All caught up!</h3>
                            <p className="text-stone-500 mt-1 text-sm">No pending reviews to moderate.</p>
                        </div>
                    ) : (
                        pendingReviews.map(review => (
                            <ReviewCard key={review._id} review={review} showActions={true} />
                        ))
                    )}
                </div>
            )}

            {/* Approved Reviews */}
            {activeTab === 'approved' && (
                <div className="space-y-3">
                    {approvedReviews.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center">
                            <MessageSquare className="w-12 h-12 text-stone-200 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-stone-900">No approved reviews yet</h3>
                            <p className="text-stone-500 mt-1 text-sm">Approved reviews will appear here.</p>
                        </div>
                    ) : (
                        approvedReviews.map(review => (
                            <ReviewCard key={review._id} review={review} showActions={false} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ReviewManagement;
