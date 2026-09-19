import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit3, Trash2, X, Package as PackageIcon, Filter, AlertCircle, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { useToast } from '../../context/ToastContext';

const API = API_BASE_URL;

const PackageManagement = ({ propertyId: propPropertyId, propertyName: propPropertyName, onBack }) => {
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryPropertyId = searchParams.get('propertyId');

    // Locked if passed as prop from parent (e.g., PropertyDetail or OwnerDashboard)
    const isLocked = Boolean(propPropertyId);
    const [filterPropertyId, setFilterPropertyId] = useState(propPropertyId || queryPropertyId || 'all');

    const [packages, setPackages] = useState([]);
    const [propertiesList, setPropertiesList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const token = () => localStorage.getItem('managerToken') || localStorage.getItem('ownerToken');
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

    function getEmptyForm(targetPropertyId = '') {
        return {
            title: '',
            description: '',
            features: [''],
            price: '',
            weekdayPrice: 0,
            weekendPrice: 0,
            maxCapacity: 10,
            image: '',
            propertyId: targetPropertyId
        };
    }

    const [formData, setFormData] = useState(() => getEmptyForm(isLocked ? propPropertyId : (filterPropertyId !== 'all' ? filterPropertyId : '')));

    // Sync filter state if query parameter changes
    useEffect(() => {
        if (!isLocked && queryPropertyId) {
            setFilterPropertyId(queryPropertyId);
        }
    }, [queryPropertyId, isLocked]);

    // Fetch properties list in standalone mode for filtering and assignment
    useEffect(() => {
        if (!isLocked) {
            const fetchProperties = async () => {
                try {
                    const res = await fetch(`${API}/api/properties`);
                    if (res.ok) {
                        const data = await res.json();
                        setPropertiesList(data);
                    }
                } catch (err) {
                    console.error('Failed to fetch properties for filter:', err);
                }
            };
            fetchProperties();
        }
    }, [isLocked]);

    const activePropertyId = isLocked 
        ? propPropertyId 
        : (filterPropertyId !== 'all' ? filterPropertyId : null);

    const fetchPackages = useCallback(async () => {
        try {
            setIsLoading(true);
            const url = activePropertyId 
                ? `${API}/api/packages?propertyId=${activePropertyId}` 
                : `${API}/api/packages`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch packages');
            setPackages(await res.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [activePropertyId]);

    useEffect(() => {
        fetchPackages();
    }, [fetchPackages]);

    const handleFilterChange = (val) => {
        setFilterPropertyId(val);
        if (val === 'all') {
            searchParams.delete('propertyId');
        } else {
            searchParams.set('propertyId', val);
        }
        setSearchParams(searchParams, { replace: true });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const targetPropId = isLocked ? propPropertyId : (formData.propertyId || undefined);
            const body = { 
                ...formData, 
                propertyId: targetPropId || null 
            };
            body.features = body.features.filter(f => f.trim());

            const url = editingId ? `${API}/api/packages/${editingId}` : `${API}/api/packages`;
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Failed to save package');
            }
            setShowForm(false);
            setEditingId(null);
            setFormData(getEmptyForm(isLocked ? propPropertyId : (filterPropertyId !== 'all' ? filterPropertyId : '')));
            fetchPackages();
            toast.success(editingId ? 'Package updated successfully' : 'Package created successfully');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleEdit = (pkg) => {
        setEditingId(pkg._id);
        setFormData({
            title: pkg.title,
            description: pkg.description || '',
            features: pkg.features?.length ? [...pkg.features] : [''],
            price: pkg.price || '',
            weekdayPrice: pkg.weekdayPrice || 0,
            weekendPrice: pkg.weekendPrice || 0,
            maxCapacity: pkg.maxCapacity || 10,
            image: pkg.image || '',
            propertyId: pkg.property?._id || pkg.property || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this package?')) return;
        try {
            const res = await fetch(`${API}/api/packages/${id}`, { method: 'DELETE', headers: headers() });
            if (!res.ok) throw new Error('Failed to delete');
            fetchPackages();
            toast.success('Package deleted successfully');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const addFeature = () => setFormData(p => ({ ...p, features: [...p.features, ''] }));
    const removeFeature = (idx) => setFormData(p => ({ ...p, features: p.features.filter((_, i) => i !== idx) }));
    const updateFeature = (idx, val) => setFormData(p => {
        const arr = [...p.features];
        arr[idx] = val;
        return { ...p, features: arr };
    });

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-stone-900">
                            Packages{propPropertyName ? ` — ${propPropertyName}` : ''}
                        </h2>
                        <p className="text-stone-400 text-xs mt-0.5">{packages.length} packages available</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Standalone Property Filter Dropdown */}
                    {!isLocked && propertiesList.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-1.5 shadow-sm">
                            <Filter className="w-3.5 h-3.5 text-stone-400" />
                            <select
                                value={filterPropertyId}
                                onChange={(e) => handleFilterChange(e.target.value)}
                                className="text-xs font-medium text-stone-700 bg-transparent focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Properties</option>
                                {propertiesList.map(prop => (
                                    <option key={prop._id} value={prop._id}>
                                        {prop.name} ({prop.type})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            setShowForm(true);
                            setEditingId(null);
                            setFormData(getEmptyForm(isLocked ? propPropertyId : (filterPropertyId !== 'all' ? filterPropertyId : '')));
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Package
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />{error}
                </div>
            )}

            {/* Package Cards */}
            {packages.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center text-stone-400 text-sm">
                    No packages found. Create one to get started.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {packages.map(pkg => (
                        <div key={pkg._id} className="bg-white rounded-2xl border border-stone-100 p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3 gap-2">
                                <div className="min-w-0 flex-1 mr-2">
                                    <h3 className="font-semibold text-stone-900 truncate">{pkg.title}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <p className="text-emerald-600 font-medium text-sm">{pkg.price}</p>
                                        {/* Property Scope Badge */}
                                        {pkg.property ? (
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-medium border border-emerald-100 truncate">
                                                {pkg.property.name}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-md text-[11px] font-medium">
                                                Global Package
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => handleEdit(pkg)} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors" title="Edit">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(pkg._id)} className="p-2 rounded-xl hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-stone-500 mb-3 line-clamp-2">{pkg.description}</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {pkg.features?.slice(0, 4).map((f, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-stone-50 text-stone-600 rounded-md text-xs">{f}</span>
                                ))}
                                {pkg.features?.length > 4 && (
                                    <span className="px-2 py-0.5 bg-stone-50 text-stone-400 rounded-md text-xs">+{pkg.features.length - 4} more</span>
                                )}
                            </div>
                            <span className="text-xs text-stone-400">
                                Capacity: {pkg.maxCapacity === 0 ? 'Unlimited' : pkg.maxCapacity}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-100 flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
                            <h2 className="text-lg font-bold text-stone-900">
                                {editingId ? 'Edit Package' : 'Create Package'}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-6 space-y-4 overflow-y-auto flex-1">
                                <div>
                                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>

                                {/* Property Assignment in Standalone Mode */}
                                {!isLocked && (
                                    <div>
                                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Assign to Property</label>
                                        <select
                                            value={formData.propertyId}
                                            onChange={e => setFormData(p => ({ ...p, propertyId: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                                        >
                                            <option value="">-- Global Package (Applies to all campsites) --</option>
                                            {propertiesList.map(prop => (
                                                <option key={prop._id} value={prop._id}>
                                                    {prop.name} ({prop.type === 'campsite' ? 'Campsite' : 'Villa'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Display Price *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. ₹1,499 / person"
                                            value={formData.price}
                                            onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Max Capacity</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={formData.maxCapacity}
                                            onChange={e => setFormData(p => ({ ...p, maxCapacity: Number(e.target.value) }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                        <p className="text-[10px] text-stone-400 mt-1">0 = Unlimited</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Weekday Price (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.weekdayPrice}
                                            onChange={e => setFormData(p => ({ ...p, weekdayPrice: Number(e.target.value) }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Weekend Price (₹)</label>
                                        <input
                                            type="number"
                                            value={formData.weekendPrice}
                                            onChange={e => setFormData(p => ({ ...p, weekendPrice: Number(e.target.value) }))}
                                            className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Description</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Features</label>
                                        <button type="button" onClick={addFeature} className="text-xs text-emerald-600 font-semibold">+ Add</button>
                                    </div>
                                    {formData.features.map((f, i) => (
                                        <div key={i} className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={f}
                                                onChange={e => updateFeature(i, e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                            {formData.features.length > 1 && (
                                                <button type="button" onClick={() => removeFeature(i)} className="p-2 text-stone-400 hover:text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Image URL</label>
                                    <input
                                        type="text"
                                        value={formData.image}
                                        onChange={e => setFormData(p => ({ ...p, image: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-stone-100 flex gap-3 sticky bottom-0 bg-white shrink-0">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingId(null); }}
                                    className="flex-1 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-semibold hover:bg-stone-200 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm"
                                >
                                    {editingId ? 'Save Changes' : 'Create Package'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackageManagement;
