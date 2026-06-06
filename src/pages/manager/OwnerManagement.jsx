import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit3, Trash2, X, Key, Building2, AlertCircle, Mail, Phone, UserPlus, TrendingUp, IndianRupee, Eye, EyeOff } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const OwnerManagement = () => {
    const navigate = useNavigate();
    const [owners, setOwners] = useState([]);
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showPasswordReset, setShowPasswordReset] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(null);
    const [assignPropertyIds, setAssignPropertyIds] = useState([]);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', propertyIds: [] });
    const [ownerRevenue, setOwnerRevenue] = useState({});
    const [showPasswords, setShowPasswords] = useState({});

    const token = () => localStorage.getItem('managerToken');
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

    const fetchData = useCallback(async () => {
        if (!token()) return navigate('/manager/login');
        try {
            setIsLoading(true);
            const [oRes, pRes, revRes] = await Promise.all([
                fetch(`${API}/api/owners`, { headers: { Authorization: `Bearer ${token()}` } }),
                fetch(`${API}/api/properties?isActive=all`, { headers: { Authorization: `Bearer ${token()}` } }),
                fetch(`${API}/api/revenue/analytics/by-property`, { headers: { Authorization: `Bearer ${token()}` } })
            ]);
            if (oRes.status === 401) { localStorage.removeItem('managerToken'); return navigate('/manager/login'); }
            const ownersData = oRes.ok ? await oRes.json() : [];
            setOwners(ownersData);
            setProperties(pRes.ok ? await pRes.json() : []);

            // Build per-owner revenue map: propertyId -> { totalAmount, totalCommission }
            if (revRes.ok) {
                const revData = await revRes.json();
                // revData: [{ propertyId, propertyName, totalAmount, totalCommission }]
                const revenueMap = {};
                if (Array.isArray(revData)) {
                    revData.forEach(r => {
                        if (r.propertyId) revenueMap[r.propertyId] = r;
                    });
                }
                setOwnerRevenue(revenueMap);
            }
        } catch (err) { setError(err.message); }
        finally { setIsLoading(false); }
    }, [navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/api/owners`, { method: 'POST', headers: headers(), body: JSON.stringify(formData) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            setShowForm(false); setFormData({ name: '', email: '', password: '', phone: '', propertyIds: [] });
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/api/owners/${editingId}`, {
                method: 'PUT', headers: headers(),
                body: JSON.stringify({ name: formData.name, email: formData.email, phone: formData.phone })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            setShowForm(false); setEditingId(null);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete owner "${name}"?`)) return;
        try {
            const res = await fetch(`${API}/api/owners/${id}`, { method: 'DELETE', headers: headers() });
            if (!res.ok) throw new Error('Failed to delete');
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) return alert('Password must be at least 6 characters');
        try {
            const res = await fetch(`${API}/api/owners/${showPasswordReset}/reset-password`, {
                method: 'PUT', headers: headers(), body: JSON.stringify({ newPassword })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            // After reset, update the local owner list with the new password so manager sees it immediately
            setOwners(prev => prev.map(o => o._id === showPasswordReset ? { ...o, plainPassword: newPassword } : o));
            alert('Password updated! The new password is now visible in the owner card.');
            setShowPasswordReset(null); setNewPassword('');
        } catch (err) { alert(err.message); }
    };

    const handleAssignProperties = async () => {
        try {
            const res = await fetch(`${API}/api/owners/${showAssignModal}/properties`, {
                method: 'PUT', headers: headers(), body: JSON.stringify({ propertyIds: assignPropertyIds })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            setShowAssignModal(null);
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const openEdit = (owner) => {
        setEditingId(owner._id);
        setFormData({ name: owner.name, email: owner.email, phone: owner.phone || '', password: '', propertyIds: [] });
        setShowForm(true);
    };

    const openAssign = (owner) => {
        setShowAssignModal(owner._id);
        setAssignPropertyIds(owner.properties?.map(p => p._id) || []);
    };

    const togglePropertyAssign = (propId) => {
        setAssignPropertyIds(prev => prev.includes(propId) ? prev.filter(id => id !== propId) : [...prev, propId]);
    };

    if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900">Owners</h1>
                    <p className="text-stone-500 text-sm mt-1">{owners.length} property owners</p>
                </div>
                <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', email: '', password: '', phone: '', propertyIds: [] }); }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                    <UserPlus className="w-4 h-4" /> Add Owner
                </button>
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

            {/* OWNERS LIST */}
            {owners.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center text-stone-400 text-sm">No owners yet. Create one to assign properties.</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {owners.map(owner => (
                        <div key={owner._id} className="bg-white rounded-2xl border border-stone-100 p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-purple-700">{owner.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-stone-900 text-[15px]">{owner.name}</h3>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                            <span className="text-xs text-stone-400 flex items-center gap-1"><Mail className="w-3 h-3" />{owner.email}</span>
                                            {owner.phone && <span className="text-xs text-stone-400 flex items-center gap-1"><Phone className="w-3 h-3" />{owner.phone}</span>}
                                        </div>
                                        {/* PASSWORD DISPLAY */}
                                        <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg w-fit">
                                            <Key className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                            <span className="text-xs font-semibold text-amber-700 mr-1">Password:</span>
                                            {owner.plainPassword ? (
                                                <>
                                                    <span className={`font-mono text-xs font-bold text-amber-900 ${showPasswords[owner._id] ? '' : 'blur-[3px] select-none'}`}>
                                                        {owner.plainPassword}
                                                    </span>
                                                    <button
                                                        onClick={() => setShowPasswords(p => ({ ...p, [owner._id]: !p[owner._id] }))}
                                                        className="ml-1 text-amber-600 hover:text-amber-800 transition-colors"
                                                        title={showPasswords[owner._id] ? 'Hide password' : 'Show password'}
                                                    >
                                                        {showPasswords[owner._id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-amber-600 italic">Not set — use "Password" button to set one</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue Analytics */}
                            {(() => {
                                const propIds = owner.properties?.map(p => p._id) || [];
                                const ownerEarnings = propIds.reduce((sum, pid) => {
                                    const r = ownerRevenue[pid];
                                    // Owner earnings = amount minus commission (commission is manager's cut)
                                    return sum + (r ? (r.totalAmount - r.totalCommission) : 0);
                                }, 0);
                                return ownerEarnings > 0 ? (
                                    <div className="mb-3 px-3 py-2 bg-emerald-50 rounded-xl flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-emerald-700">Total Earnings</p>
                                            <p className="text-base font-black text-emerald-800">₹{ownerEarnings.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            {/* Assigned Properties */}
                            <div className="mb-3">
                                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Assigned Properties ({owner.properties?.length || 0})</p>
                                {owner.properties?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {owner.properties.map(p => (
                                            <span key={p._id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${p.type === 'campsite' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                {p.type === 'campsite' ? '⛺' : '🏡'} {p.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-stone-400 italic">No properties assigned</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-3 border-t border-stone-100">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openEdit(owner)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                                        <Edit3 className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button onClick={() => openAssign(owner)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                        <Building2 className="w-3.5 h-3.5" /> Assign
                                    </button>
                                    <button onClick={() => { setShowPasswordReset(showPasswordReset === owner._id ? null : owner._id); setNewPassword(''); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                                        <Key className="w-3.5 h-3.5" /> Password
                                    </button>
                                    <button onClick={() => handleDelete(owner._id, owner.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors ml-auto">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {showPasswordReset === owner._id && (
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                                        <button onClick={handleResetPassword} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">Save</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE/EDIT MODAL */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-100">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                            <h2 className="text-lg font-bold text-stone-900">{editingId ? 'Edit Owner' : 'Create Owner'}</h2>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={editingId ? handleUpdate : handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Name *</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Email *</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            {!editingId && (
                                <div>
                                    <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Password *</label>
                                    <input type="password" required minLength={6} value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider block mb-1.5">Phone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                                {editingId ? 'Save Changes' : 'Create Owner'}
                            </button>
                        </form>
                    </div>
                </div>
            )}



            {/* ASSIGN PROPERTIES MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-100">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                            <h2 className="text-lg font-bold text-stone-900">Assign Properties</h2>
                            <button onClick={() => setShowAssignModal(null)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-2 max-h-[50vh] overflow-y-auto">
                            {properties.length === 0 ? (
                                <p className="text-sm text-stone-400">No properties available to assign.</p>
                            ) : (
                                properties.map(p => (
                                    <button key={p._id} onClick={() => togglePropertyAssign(p._id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                                            assignPropertyIds.includes(p._id) ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'
                                        }`}>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                                            assignPropertyIds.includes(p._id) ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'
                                        }`}>
                                            {assignPropertyIds.includes(p._id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                                            <p className="text-xs text-stone-400">{p.type} • {p.location || 'No location'}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
                            <button onClick={handleAssignProperties} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Save Assignment</button>
                            <button onClick={() => setShowAssignModal(null)} className="px-5 py-2.5 border border-stone-200 text-stone-600 rounded-xl text-sm font-semibold hover:bg-stone-50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerManagement;
