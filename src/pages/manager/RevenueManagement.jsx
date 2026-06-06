import { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
    TrendingUp, IndianRupee, FileText, Plus, Search, Filter, Trash2, X, AlertCircle, Building2, ArrowUpDown
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

// Recharts Custom Tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-stone-100 shadow-xl rounded-xl">
                <p className="font-bold text-stone-800 text-sm mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                        {entry.name}: ₹{entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const RevenueManagement = () => {
    const [overview, setOverview] = useState(null);
    const [trends, setTrends] = useState([]);
    const [byProperty, setByProperty] = useState([]);
    const [entries, setEntries] = useState([]);
    const [properties, setProperties] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        property: '',
        amount: '',
        commission: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [sortEntries, setSortEntries] = useState('date_desc');

    useEffect(() => {
        fetchData();
        fetchProperties();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('managerToken');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Overview
            const overRes = await fetch(`${API}/api/revenue/analytics/overview`, { headers });
            const overData = await overRes.json();
            if (overRes.ok) setOverview(overData.periods); // Set overview to the periods object directly

            // Fetch Trends (last 6 months grouped by month)
            const d = new Date();
            d.setMonth(d.getMonth() - 6);
            const trendsRes = await fetch(`${API}/api/revenue/analytics/trends?groupBy=month&startDate=${d.toISOString()}`, { headers });
            const trendsData = await trendsRes.json();
            if (trendsRes.ok && Array.isArray(trendsData)) {
                // Backend returns array of { period, totalAmount, totalCommission }
                setTrends(trendsData.map(t => ({
                    name: t.period,
                    Revenue: t.totalAmount,
                    Commission: t.totalCommission
                })).reverse()); // Oldest to newest
            }

            // Fetch By Property
            const propRes = await fetch(`${API}/api/revenue/analytics/by-property`, { headers });
            const propData = await propRes.json();
            if (propRes.ok && Array.isArray(propData)) {
                // Backend returns array of { propertyName, totalAmount, totalCommission }
                setByProperty(propData.map(p => ({
                    name: p.propertyName || 'Unknown',
                    value: p.totalAmount,
                    commission: p.totalCommission
                })));
            }

            // Fetch Entries list
            const entRes = await fetch(`${API}/api/revenue?limit=50`, { headers });
            const entData = await entRes.json();
            if (entRes.ok && entData.entries) {
                setEntries(entData.entries);
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProperties = async () => {
        try {
            const res = await fetch(`${API}/api/properties?isActive=all`);
            const data = await res.json();
            if (res.ok) setProperties(data.data || data);
        } catch (err) {
            console.error("Failed to load properties", err);
        }
    };

    const handleCreateRevenue = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('managerToken');
            const res = await fetch(`${API}/api/revenue`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to add revenue');

            setShowModal(false);
            setFormData({
                property: '', amount: '', commission: '',
                date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            fetchData(); // Refresh everything
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this revenue entry? This affects analytics permanently.")) return;
        try {
            const token = localStorage.getItem('managerToken');
            const res = await fetch(`${API}/api/revenue/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Delete failed");
            fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const filteredEntries = [...entries]
        .sort((a, b) => {
            if (sortEntries === 'date_desc') return new Date(b.date) - new Date(a.date);
            if (sortEntries === 'date_asc') return new Date(a.date) - new Date(b.date);
            if (sortEntries === 'amount_desc') return b.amount - a.amount;
            if (sortEntries === 'amount_asc') return a.amount - b.amount;
            if (sortEntries === 'commission_desc') return b.commission - a.commission;
            if (sortEntries === 'property') return (a.property?.name || '').localeCompare(b.property?.name || '');
            return 0;
        });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Revenue & Analytics</h1>
                    <p className="text-sm text-stone-500 mt-1">Track financial performance and commission across properties.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide hover:bg-stone-800 transition-all active:scale-95 shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Entry</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* OVERVIEW CARDS */}
            {overview && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Commission — PRIMARY HERO METRIC */}
                    <div className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="w-24 h-24 text-white" />
                        </div>
                        <p className="text-sm font-bold text-emerald-100 tracking-widest uppercase">Your Commission (All Time)</p>
                        <h3 className="text-4xl font-black text-white mt-2">
                            ₹{(overview.allTime?.totalCommission || 0).toLocaleString()}
                        </h3>
                        <p className="text-emerald-200 text-sm mt-3">
                            This month: ₹{(overview.thisMonth?.totalCommission || 0).toLocaleString()}
                            {' · '}
                            This week: ₹{(overview.thisWeek?.totalCommission || 0).toLocaleString()}
                        </p>
                    </div>
                    {/* Total Entries — secondary */}
                    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileText className="w-16 h-16" />
                        </div>
                        <p className="text-xs font-bold text-stone-400 tracking-widest uppercase mb-1">Total Revenue (All Time)</p>
                        <p className="text-lg font-bold text-stone-500">₹{(overview.allTime?.totalAmount || 0).toLocaleString()}</p>
                        <div className="mt-4 pt-4 border-t border-stone-100">
                            <p className="text-xs font-bold text-stone-400 tracking-widest uppercase mb-1">Total Entries</p>
                            <p className="text-2xl font-black text-stone-900">{overview.allTime?.count || 0}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trends Chart */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                    <h3 className="text-lg font-bold text-stone-900 mb-6 tracking-tight">Revenue Trends (Last 6 Months)</h3>
                    {trends.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#78716c' }} width={60} tickFormatter={(value) => `₹${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line type="monotone" dataKey="Revenue" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="Commission" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-stone-400 text-sm font-medium">No trend data available</div>
                    )}
                </div>

                {/* Property Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
                    <h3 className="text-lg font-bold text-stone-900 mb-6 tracking-tight">Revenue by Property</h3>
                    {byProperty.length > 0 ? (
                        <div className="h-[300px] w-full flex flex-col sm:flex-row items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={byProperty}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {byProperty.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="sm:w-1/2 w-full mt-4 sm:mt-0 flex flex-col gap-3 justify-center pl-4 border-t sm:border-t-0 sm:border-l border-stone-100 pt-4 sm:pt-0">
                                {byProperty.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                            <span className="text-stone-600 font-medium truncate max-w-[120px]" title={p.name}>{p.name}</span>
                                        </div>
                                        <span className="font-bold text-stone-900">₹{p.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-stone-400 text-sm font-medium">No property data available</div>
                    )}
                </div>
            </div>

            {/* REVENUE ENTRIES TABLE */}
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-stone-50/50">
                    <h3 className="text-lg font-bold text-stone-900 tracking-tight">Revenue Entries</h3>
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">

                        <div className="flex items-center gap-1.5">
                            <ArrowUpDown className="w-4 h-4 text-stone-400" />
                            <select value={sortEntries} onChange={(e) => setSortEntries(e.target.value)}
                                className="bg-white border border-stone-200 text-stone-700 text-sm rounded-lg p-2 py-1.5 font-medium">
                                <option value="date_desc">Date ↓ (Newest)</option>
                                <option value="date_asc">Date ↑ (Oldest)</option>
                                <option value="amount_desc">Amount ↓</option>
                                <option value="amount_asc">Amount ↑</option>
                                <option value="commission_desc">Commission ↓</option>
                                <option value="property">By Property</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-stone-50/80 text-stone-500 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="px-6 py-4 border-b border-stone-100">Date</th>
                                <th className="px-6 py-4 border-b border-stone-100">Property</th>

                                <th className="px-6 py-4 border-b border-stone-100 text-right">Amount</th>
                                <th className="px-6 py-4 border-b border-stone-100 text-right">Commission</th>
                                <th className="px-6 py-4 border-b border-stone-100 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 bg-white">
                            {filteredEntries.map((entry) => (
                                <tr key={entry._id} className="hover:bg-stone-50/80 transition-colors group">
                                    <td className="px-6 py-4 text-stone-600 font-medium whitespace-nowrap">
                                        {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
                                            <span className="font-bold text-stone-800">{entry.property?.name || 'Unknown Property'}</span>
                                        </div>
                                        {entry.notes && <p className="text-xs text-stone-400 mt-1 line-clamp-1">{entry.notes}</p>}
                                    </td>

                                    <td className="px-6 py-4 text-right font-black text-stone-900">
                                        ₹{entry.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                        ₹{entry.commission.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(entry._id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Delete Entry"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-stone-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText className="w-10 h-10 text-stone-200 mb-3" />
                                            <p className="font-medium text-stone-600">No revenue entries found</p>
                                            <p className="text-sm text-stone-400 mt-1">Add a new entry to start tracking revenue.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD REVENUE MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-lg font-bold text-stone-900">Add Revenue Entry</h3>
                                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mt-1">Manual Entry</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-stone-400" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleCreateRevenue} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Property</label>
                                    <select
                                        required
                                        value={formData.property}
                                        onChange={(e) => setFormData({...formData, property: e.target.value})}
                                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                    >
                                        <option value="" disabled>Select Property</option>
                                        {properties.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Amount (₹)</label>
                                        <input
                                            type="number"
                                            required min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                            placeholder="Total value"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Commission (₹)</label>
                                        <input
                                            type="number"
                                            required min="0"
                                            value={formData.commission}
                                            onChange={(e) => setFormData({...formData, commission: e.target.value})}
                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                            placeholder="Your cut"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-900 tracking-wider mb-2 uppercase">Notes (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                            placeholder="Add any additional details..."
                                        />
                                    </div>
                                </div>



                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold tracking-wide hover:bg-stone-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold tracking-wide hover:bg-stone-800 transition-colors shadow-sm"
                                    >
                                        Save Entry
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevenueManagement;
