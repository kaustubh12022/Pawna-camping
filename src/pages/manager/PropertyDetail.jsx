import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Clock, Image as ImageIcon, Package, Tent, Home, AlertCircle } from 'lucide-react';
import PackageManagement from './PackageManagement';

const API = import.meta.env.VITE_API_URL || '';

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

const PropertyDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [property, setProperty] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [isLoading, setIsLoading] = useState(true);

    const token = () => localStorage.getItem('managerToken');

    useEffect(() => {
        const fetchProperty = async () => {
            if (!token()) return navigate('/manager/login');
            try {
                const res = await fetch(`${API}/api/properties/id/${id}`, {
                    headers: { Authorization: `Bearer ${token()}` }
                });
                if (res.status === 401) { localStorage.removeItem('managerToken'); return navigate('/manager/login'); }
                if (!res.ok) throw new Error('Property not found');
                setProperty(await res.json());
            } catch (err) { console.error(err); }
            finally { setIsLoading(false); }
        };
        fetchProperty();
    }, [id, navigate]);

    if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
    if (!property) return <div className="text-center py-20 text-stone-400">Property not found</div>;

    const tabs = [
        { id: 'details', label: 'Details' },
        ...(property.type === 'campsite' ? [{ id: 'packages', label: 'Packages' }] : []),
        { id: 'gallery', label: 'Gallery' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/manager/properties')} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-stone-900 truncate">{property.name}</h1>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${property.type === 'campsite' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {property.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${property.isActive ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                            {property.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    {property.googleMapsLink && <a href={property.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline mt-0.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-stone-400" />Map Link</a>}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Details Tab */}
            {activeTab === 'details' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Info Card */}
                    <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">Property Info</h3>
                        {property.shortDescription && <p className="text-sm text-stone-600">{property.shortDescription}</p>}
                        {property.description && <p className="text-sm text-stone-500">{property.description}</p>}
                        
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div><p className="text-xs text-stone-400 uppercase tracking-wider">Max Guests</p><p className="text-sm font-medium text-stone-800 mt-0.5">{property.maxGuests}</p></div>
                            <div><p className="text-xs text-stone-400 uppercase tracking-wider">Price</p><p className="text-sm font-medium text-emerald-600 mt-0.5">{property.pricing?.priceDisplay || '—'}/{property.pricing?.pricePer}</p></div>
                            <div><p className="text-xs text-stone-400 uppercase tracking-wider">Check-in</p><p className="text-sm font-medium text-stone-800 mt-0.5">{property.checkInTime}</p></div>
                            <div><p className="text-xs text-stone-400 uppercase tracking-wider">Check-out</p><p className="text-sm font-medium text-stone-800 mt-0.5">{property.checkOutTime}</p></div>
                        </div>

                        {property.owner && (
                            <div className="pt-2 border-t border-stone-100">
                                <p className="text-xs text-stone-400 uppercase tracking-wider">Owner</p>
                                <p className="text-sm font-medium text-stone-800 mt-0.5">{property.owner.name} ({property.owner.email})</p>
                            </div>
                        )}
                    </div>

                    {/* Amenities & Rules */}
                    <div className="space-y-4">
                        {property.amenities?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-stone-100 p-6">
                                <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">Amenities</h3>
                                <div className="flex flex-wrap gap-2">
                                    {property.amenities.map((a, i) => (
                                        <span key={i} className="px-3 py-1 bg-stone-50 text-stone-700 rounded-lg text-sm">{a}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {property.rules?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-stone-100 p-6">
                                <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wider mb-3">Rules</h3>
                                <ul className="space-y-1.5">
                                    {property.rules.map((r, i) => (
                                        <li key={i} className="text-sm text-stone-600 flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-stone-300 mt-1.5 flex-shrink-0" /> {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Packages Tab (campsite only) */}
            {activeTab === 'packages' && property.type === 'campsite' && (
                <PackageManagement propertyId={property._id} propertyName={property.name} />
            )}

            {/* Gallery Tab */}
            {activeTab === 'gallery' && (
                <div className="space-y-4">
                    {property.coverImage && (
                        <div className="bg-white rounded-2xl border border-stone-100 p-4">
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Cover Image</p>
                            <MediaRenderer src={property.coverImage} alt="Cover" className="w-full max-h-64 object-cover rounded-xl" />
                        </div>
                    )}
                    {property.images?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-stone-100 p-4">
                            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Gallery ({property.images.length} images)</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {property.images.map((img, i) => (
                                    <MediaRenderer key={i} src={img} alt={`Gallery ${i + 1}`} className="w-full h-32 object-cover rounded-xl border border-stone-100" />
                                ))}
                            </div>
                        </div>
                    )}
                    {!property.coverImage && (!property.images || property.images.length === 0) && (
                        <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center text-stone-400 text-sm">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                            No images uploaded. Edit the property to add images.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PropertyDetail;
