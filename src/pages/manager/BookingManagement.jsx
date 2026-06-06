import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, CalendarCheck, AlertCircle, Check, X as XIcon, Trash2, Plus, Download, ChevronDown, ArrowUpDown } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';
const today = new Date().toISOString().split('T')[0];

const BookingManagement = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [properties, setProperties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [propertyFilter, setPropertyFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [exportPeriod, setExportPeriod] = useState('');

    const [newBooking, setNewBooking] = useState({
        customerName: '', customerPhone: '', propertyId: '',
        packageType: '', checkIn: today, checkOut: today,
        guests: 1, vegGuests: 0, nonVegGuests: 0
    });

    const token = () => localStorage.getItem('managerToken');
    const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

    const fetchData = useCallback(async () => {
        if (!token()) return navigate('/manager/login');
        try {
            setIsLoading(true);
            const [bRes, pRes] = await Promise.all([
                fetch(`${API}/api/bookings`, { headers: { Authorization: `Bearer ${token()}` } }),
                fetch(`${API}/api/properties?isActive=all`, { headers: { Authorization: `Bearer ${token()}` } })
            ]);
            if (bRes.status === 401) { localStorage.removeItem('managerToken'); return navigate('/manager/login'); }
            setBookings(bRes.ok ? await bRes.json() : []);
            setProperties(pRes.ok ? await pRes.json() : []);
        } catch (err) { setError(err.message); }
        finally { setIsLoading(false); }
    }, [navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            const res = await fetch(`${API}/api/bookings/${id}/status`, {
                method: 'PATCH', headers: headers(), body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Permanently delete this booking?')) return;
        try {
            const res = await fetch(`${API}/api/bookings/${id}`, { method: 'DELETE', headers: headers() });
            if (!res.ok) throw new Error('Failed to delete');
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleCreateBooking = async (e) => {
        e.preventDefault();
        try {
            const selectedProp = properties.find(p => p._id === newBooking.propertyId);
            const payload = {
                ...newBooking,
                propertyId: newBooking.propertyId,
                // villas don't need food
                vegGuests: selectedProp?.type === 'villa' ? 0 : newBooking.vegGuests,
                nonVegGuests: selectedProp?.type === 'villa' ? 0 : newBooking.nonVegGuests,
            };
            const res = await fetch(`${API}/api/bookings/manager`, {
                method: 'POST', headers: headers(), body: JSON.stringify(payload)
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            setShowCreateModal(false);
            setNewBooking({ customerName: '', customerPhone: '', propertyId: '', packageType: '', checkIn: today, checkOut: today, guests: 1, vegGuests: 0, nonVegGuests: 0 });
            fetchData();
        } catch (err) { alert(err.message); }
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (exportPeriod) params.set('period', exportPeriod);
        if (propertyFilter !== 'all') params.set('propertyId', propertyFilter);
        const url = `${API}/api/bookings/export?${params}`;
        const a = document.createElement('a');
        a.href = url;
        a.click();
    };

    const sorted = [...bookings].sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'checkin') return new Date(a.checkIn) - new Date(b.checkIn);
        if (sortBy === 'property') return (a.property?.name || '').localeCompare(b.property?.name || '');
        if (sortBy === 'type') return (a.propertyType || '').localeCompare(b.propertyType || '');
        return 0;
    });

    const filtered = sorted.filter(b => {
        if (b.status !== statusFilter) return false;
        if (propertyFilter !== 'all' && b.property?._id !== propertyFilter) return false;
        if (dateFilter) {
            const checkIn = new Date(b.checkIn).toISOString().split('T')[0];
            if (checkIn !== dateFilter) return false;
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            if (!b.customerName.toLowerCase().includes(q) && !b.customerPhone.includes(q)) return false;
        }
        return true;
    });

    const statusCounts = {
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
    };

    const selectedNewProp = properties.find(p => p._id === newBooking.propertyId);
    const isVillaNew = selectedNewProp?.type === 'villa';

    if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900">Bookings</h1>
                    <p className="text-stone-500 text-sm mt-1">{bookings.length} total bookings</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Export */}
                    <div className="flex items-center gap-1">
                        <select value={exportPeriod} onChange={e => setExportPeriod(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                            <option value="">All Time</option>
                            <option value="daily">Today</option>
                            <option value="weekly">This Week</option>
                            <option value="monthly">This Month</option>
                        </select>
                        <button onClick={handleExport}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors">
                            <Download className="w-4 h-4" /> CSV
                        </button>
                    </div>
                    <button onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> New Booking
                    </button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

            {/* STATUS TABS */}
            <div className="flex flex-wrap gap-2">
                {['pending', 'confirmed', 'cancelled'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                            statusFilter === s
                                ? s === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                : s === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-600 border-red-200'
                                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                        }`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
                    </button>
                ))}
            </div>

            {/* FILTERS ROW */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" placeholder="Search by name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option value="all">All Properties</option>
                    {properties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                {dateFilter && <button onClick={() => setDateFilter('')} className="px-3 py-2.5 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 text-sm">Clear</button>}
                {/* Sort */}
                <div className="relative">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="checkin">Check-in Date</option>
                        <option value="property">By Property</option>
                        <option value="type">By Type</option>
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="px-6 py-16 text-center text-stone-400 text-sm">
                        No {statusFilter} bookings found{propertyFilter !== 'all' || dateFilter ? ' with the selected filters' : ''}.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-500 text-xs font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3">Customer</th>
                                    <th className="px-5 py-3">Property / Package</th>
                                    <th className="px-5 py-3">Dates</th>
                                    <th className="px-5 py-3">Guests</th>
                                    <th className="px-5 py-3">Food</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {filtered.map(b => (
                                    <tr key={b._id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-stone-800">{b.customerName}</div>
                                            <div className="text-xs text-stone-400 mt-0.5">{b.customerPhone}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-medium text-stone-700">{b.property?.name || '—'}</div>
                                            <div className="text-xs text-stone-400 mt-0.5">{b.packageType || (b.propertyType === 'villa' ? 'Villa Booking' : '—')}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="text-stone-700">{new Date(b.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} → {new Date(b.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                            <div className="text-xs text-stone-400 mt-0.5">{b.nights || 1} night{(b.nights || 1) > 1 ? 's' : ''}</div>
                                        </td>
                                        <td className="px-5 py-4 text-stone-600">{b.guests}</td>
                                        <td className="px-5 py-4">
                                            {b.propertyType === 'villa' ? (
                                                <span className="text-xs text-stone-400 italic">N/A</span>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    {b.vegGuests > 0 && <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-50 text-green-700 w-max">{b.vegGuests} Veg</span>}
                                                    {b.nonVegGuests > 0 && <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 w-max">{b.nonVegGuests} Non-Veg</span>}
                                                    {b.vegGuests === 0 && b.nonVegGuests === 0 && b.foodPreference && <span className="text-xs text-stone-500">{b.foodPreference}</span>}
                                                    {b.vegGuests === 0 && b.nonVegGuests === 0 && !b.foodPreference && <span className="text-xs text-stone-400">—</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {b.status === 'pending' && (
                                                    <button onClick={() => handleUpdateStatus(b._id, 'confirmed')}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                                                        <Check className="w-3.5 h-3.5" /> Confirm
                                                    </button>
                                                )}
                                                {b.status !== 'cancelled' && (
                                                    <button onClick={() => handleUpdateStatus(b._id, 'cancelled')}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-600 text-xs font-semibold rounded-lg hover:bg-stone-200 transition-colors">
                                                        <XIcon className="w-3.5 h-3.5" /> Cancel
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(b._id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE BOOKING MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-lg font-bold text-stone-900">Create Booking</h3>
                                <p className="text-xs text-stone-500 mt-0.5">Manual entry by manager</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                                <XIcon className="w-5 h-5 text-stone-400" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleCreateBooking} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Customer Name *</label>
                                        <input required value={newBooking.customerName} onChange={e => setNewBooking(p => ({...p, customerName: e.target.value}))}
                                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Phone *</label>
                                        <input required value={newBooking.customerPhone} onChange={e => setNewBooking(p => ({...p, customerPhone: e.target.value}))}
                                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Property *</label>
                                        <select required value={newBooking.propertyId} onChange={e => setNewBooking(p => ({...p, propertyId: e.target.value}))}
                                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                                            <option value="">Select Property</option>
                                            {properties.map(p => <option key={p._id} value={p._id}>{p.name} ({p.type})</option>)}
                                        </select>
                                    </div>
                                    {!isVillaNew && (
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Package</label>
                                            <input value={newBooking.packageType} onChange={e => setNewBooking(p => ({...p, packageType: e.target.value}))}
                                                placeholder="e.g. Campfire Package"
                                                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Check-In *</label>
                                        <input type="date" required value={newBooking.checkIn} onChange={e => setNewBooking(p => ({...p, checkIn: e.target.value}))}
                                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Check-Out *</label>
                                        <input type="date" required value={newBooking.checkOut} onChange={e => setNewBooking(p => ({...p, checkOut: e.target.value}))}
                                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Guests *</label>
                                        <input type="number" required min="1" value={newBooking.guests} onChange={e => setNewBooking(p => ({...p, guests: +e.target.value}))}
                                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    {!isVillaNew && <>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Veg Guests</label>
                                            <input type="number" min="0" value={newBooking.vegGuests} onChange={e => setNewBooking(p => ({...p, vegGuests: +e.target.value}))}
                                                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-1.5">Non-Veg Guests</label>
                                            <input type="number" min="0" value={newBooking.nonVegGuests} onChange={e => setNewBooking(p => ({...p, nonVegGuests: +e.target.value}))}
                                                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                                        </div>
                                    </>}
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors">Cancel</button>
                                    <button type="submit"
                                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingManagement;
