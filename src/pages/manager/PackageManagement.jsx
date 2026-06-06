import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit3, Trash2, X, Package, ChevronDown, AlertCircle, ArrowLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const PackageManagement = ({ propertyId, propertyName, onBack }) => {
    const navigate = useNavigate();
    const [packages, setPackages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(getEmptyForm());

    function getEmptyForm() {
        return { title: '', description: '', features: [''], price: '', priceValue: 0, maxCapacity: 10, image: '' };
    }

    const token = () => localStorage.getItem('managerToken');
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

    const fetchPackages = useCallback(async () => {
        try {
            setIsLoading(true);
            const url = propertyId ? `${API}/api/packages?propertyId=${propertyId}` : `${API}/api/packages`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch packages');
            setPackages(await res.json());
        } catch (err) { setError(err.message); }
        finally { setIsLoading(false); }
    }, [propertyId]);

    useEffect(() => { fetchPackages(); }, [fetchPackages]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const body = { ...formData, propertyId: propertyId || undefined };
            body.features = body.features.filter(f => f.trim());

            const url = editingId ? `${API}/api/packages/${editingId}` : `${API}/api/packages`;
            const method = editingId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            setShowForm(false); setEditingId(null); setFormData(getEmptyForm());
            fetchPackages();
        } catch (err) { alert(err.message); }
    };

    const handleEdit = (pkg) => {
        setEditingId(pkg._id);
        setFormData({
            title: pkg.title, description: pkg.description || '', features: pkg.features?.length ? [...pkg.features] : [''],
            price: pkg.price || '', priceValue: pkg.priceValue || 0, maxCapacity: pkg.maxCapacity || 10, image: pkg.image || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this package?')) return;
        try {
            const res = await fetch(`${API}/api/packages/${id}`, { method: 'DELETE', headers: headers() });
            if (!res.ok) throw new Error('Failed to delete');
            fetchPackages();
        } catch (err) { alert(err.message); }
    };

    const addFeature = () => setFormData(p => ({ ...p, features: [...p.features, ''] }));
    const removeFeature = (idx) => setFormData(p => ({ ...p, features: p.features.filter((_, i) => i !== idx) }));
    const updateFeature = (idx, val) => setFormData(p => {
        const arr = [...p.features]; arr[idx] = val; return { ...p, features: arr };
    });

    if (isLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

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
                        <h2 className="text-lg font-bold text-stone-900">Packages{propertyName ? ` — ${propertyName}` : ''}</h2>
                        <p className="text-stone-400 text-xs mt-0.5">{packages.length} packages</p>
                    </div>
                </div>
                <button onClick={() => { setShowForm(true); setEditingId(null); setFormData(getEmptyForm()); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add Package
                </button>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

            {/* Package Cards */}
            {packages.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 p-10 text-center text-stone-400 text-sm">No packages yet. Create one to get started.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {packages.map(pkg => (
                        <div key={pkg._id} className="bg-white rounded-2xl border border-stone-100 p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-semibold text-stone-900">{pkg.title}</h3>
                                    <p className="text-emerald-600 font-medium text-sm mt-0.5">{pkg.price}</p>
                                </div>
                                <div className="flex gap-1.5">
                                    <button onClick={() => handleEdit(pkg)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(pkg._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <p className="text-sm text-stone-500 mb-3 line-clamp-2">{pkg.description}</p>
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {pkg.features?.slice(0, 4).map((f, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-stone-50 text-stone-600 rounded-md text-xs">{f}</span>
                                ))}
                                {pkg.features?.length > 4 && <span className="px-2 py-0.5 bg-stone-50 text-stone-400 rounded-md text-xs">+{pkg.features.length - 4} more</span>}
                            </div>
                            <span className="text-xs text-stone-400">Capacity: {pkg.maxCapacity === 0 ? 'Unlimited' : pkg.maxCapacity}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-100">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                            <h2 className="text-lg font-bold text-stone-900">{editingId ? 'Edit Package' : 'Create Package'}</h2>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div>
                                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Title *</label>
                                <input type="text" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Display Price</label>
                                    <input type="text" placeholder="₹1,200" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Max Capacity</label>
                                    <input type="number" min={0} value={formData.maxCapacity} onChange={e => setFormData(p => ({ ...p, maxCapacity: Number(e.target.value) }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                    <p className="text-[10px] text-stone-400 mt-1">0 = Unlimited</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Features</label>
                                    <button type="button" onClick={addFeature} className="text-xs text-emerald-600 font-semibold">+ Add</button>
                                </div>
                                {formData.features.map((f, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input type="text" value={f} onChange={e => updateFeature(i, e.target.value)}
                                            className="flex-1 px-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                        {formData.features.length > 1 && <button type="button" onClick={() => removeFeature(i)} className="p-2 text-stone-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Image URL</label>
                                <input type="text" value={formData.image} onChange={e => setFormData(p => ({ ...p, image: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                                {editingId ? 'Save Changes' : 'Create Package'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackageManagement;
