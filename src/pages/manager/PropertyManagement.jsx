import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, Tent, Home, ToggleLeft, ToggleRight,
    Edit3, Trash2, MapPin, Users as UsersIcon, X, ChevronDown, Image as ImageIcon, AlertCircle, Eye
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const PropertyManagement = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [owners, setOwners] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    const token = () => localStorage.getItem('managerToken');
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

    const fetchData = useCallback(async () => {
        if (!token()) return navigate('/manager/login');
        try {
            setIsLoading(true);
            const [pRes, oRes] = await Promise.all([
                fetch(`${API}/api/properties?isActive=all`, { headers: { Authorization: `Bearer ${token()}` } }),
                fetch(`${API}/api/owners`, { headers: { Authorization: `Bearer ${token()}` } })
            ]);
            if (pRes.status === 401) { localStorage.removeItem('managerToken'); return navigate('/manager/login'); }
            setProperties(pRes.ok ? await pRes.json() : []);
            setOwners(oRes.ok ? await oRes.json() : []);
        } catch (err) { setError(err.message); }
        finally { setIsLoading(false); }
    }, [navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleEdit = (prop) => {
        navigate(`/manager/properties/${prop._id}/edit`);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete "${name}" permanently?`)) return;
        try {
            const res = await fetch(`${API}/api/properties/${id}`, { method: 'DELETE', headers: headers() });
            if (!res.ok) throw new Error('Failed to delete');
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleToggleStatus = async (id) => {
        try {
            const res = await fetch(`${API}/api/properties/${id}/status`, { method: 'PATCH', headers: headers() });
            if (!res.ok) throw new Error('Failed to toggle status');
            fetchData();
        } catch (err) { alert(err.message); }
    };



    const filtered = properties.filter(p => {
        const matchType = filterType === 'all' || p.type === filterType;
        const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.address?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchType && matchSearch;
    });

    if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900">Properties</h1>
                    <p className="text-stone-500 text-sm mt-1">{properties.length} total properties</p>
                </div>
                <button onClick={() => navigate('/manager/properties/new')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add Property
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

            {/* FILTERS */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" placeholder="Search properties..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300" />
                </div>
                <div className="flex gap-2">
                    {['all', 'campsite', 'villa'].map(t => (
                        <button key={t} onClick={() => setFilterType(t)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${filterType === t ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                            {t === 'all' ? 'All' : t === 'campsite' ? '⛺ Campsites' : '🏡 Villas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* PROPERTY CARDS */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center text-stone-400 text-sm">No properties found.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map(prop => (
                        <div key={prop._id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="flex">
                                {/* Thumbnail */}
                                <div className="w-28 sm:w-36 flex-shrink-0 bg-stone-100 relative overflow-hidden">
                                    {prop.coverImage ? (
                                        <img loading="lazy" src={typeof prop.coverImage === 'string' ? prop.coverImage : prop.coverImage?.url} alt={prop.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-stone-300">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )}
                                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${prop.type === 'campsite' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                                        {prop.type}
                                    </span>
                                </div>

                                {/* Info */}
                                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-stone-900 text-[15px] truncate">{prop.name}</h3>
                                            <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${prop.isActive ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                                                {prop.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {prop.googleMapsLink && (
                                            <a href={prop.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-stone-400" />Map Link</a>
                                        )}
                                        {prop.pricing?.priceDisplay && (
                                            <p className="text-sm font-semibold text-emerald-600 mt-1">{prop.pricing.priceDisplay}<span className="text-stone-400 font-normal">/{prop.pricing.pricePer}</span></p>
                                        )}
                                        {prop.owner && (
                                            <p className="text-xs text-stone-400 mt-1">Owner: {prop.owner.name}</p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-3">
                                        <button onClick={() => navigate(`/manager/properties/${prop._id}`)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 transition-colors" title="View details">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleEdit(prop)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Edit">
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleToggleStatus(prop._id)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Toggle status">
                                            {prop.isActive ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleDelete(prop._id, prop.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}


        </div>
    );
};

export default PropertyManagement;
