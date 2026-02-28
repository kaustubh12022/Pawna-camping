import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';

const COLORS = ['#25D366', '#f97316', '#3b82f6', '#8b5cf6'];

const OwnerDashboard = () => {
    const [overview, setOverview] = useState({ totalBookings: 0, totalGuests: 0 });
    const [foodData, setFoodData] = useState([]);
    const [packageData, setPackageData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(''); // NEW OCCUPANCY DATE FILTER
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAnalytics = async () => {
            const token = localStorage.getItem('ownerToken');

            if (!token) {
                navigate('/owner/login');
                return;
            }

            try {
                // ==========================================
                // FETCH LOGIC: PROMISE.ALL FOR CONCURRENCY
                // ==========================================
                const headers = { 'Authorization': `Bearer ${token}` };

                // APPEND OPTIONAL DATE QUERY IF SELECTED
                const dateQuery = selectedDate ? `?date=${selectedDate}` : '';

                const [overviewRes, foodRes, packageRes, monthlyRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/analytics/overview${dateQuery}`, { headers }),
                    fetch(`http://localhost:5000/api/analytics/food${dateQuery}`, { headers }),
                    fetch(`http://localhost:5000/api/analytics/packages${dateQuery}`, { headers }),
                    fetch(`http://localhost:5000/api/analytics/monthly`, { headers }) // Monthly ignores date picker
                ]);

                // TOKEN EXPIRY HANDLING
                if (overviewRes.status === 401 || overviewRes.status === 403) {
                    localStorage.removeItem('ownerToken');
                    return navigate('/owner/login');
                }

                if (!overviewRes.ok || !foodRes.ok || !packageRes.ok || !monthlyRes.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                // ==========================================
                // CHART DATA MAPPING
                // ==========================================
                setOverview(await overviewRes.json());
                setFoodData(await foodRes.json());
                setPackageData(await packageRes.json());
                setMonthlyData(await monthlyRes.json());

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalytics();
    }, [navigate, selectedDate]);

    const handleLogout = () => {
        localStorage.removeItem('ownerToken');
        navigate('/owner/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-[#2B3440] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // EMPTY STATE HANDLING
    const hasData = overview.totalBookings > 0;

    return (
        <div className="min-h-screen bg-[#f3f4f6] p-6 lg:p-12">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Owner Analytics</h1>
                        <p className="text-stone-500 mt-1">Real-time business intelligence for confirmed bookings.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* 📅 DATE PICKER FILTER */}
                        <div className="flex items-center bg-white border border-stone-200 rounded-xl px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-[#2B3440] transition-all">
                            <span className="text-stone-400 text-sm mr-2" title="Filter analytics by specific day occupancy">📅</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-none text-sm text-stone-700 bg-transparent focus:ring-0 cursor-pointer outline-none"
                            />
                            {selectedDate && (
                                <button
                                    onClick={() => setSelectedDate('')}
                                    className="ml-2 text-stone-400 hover:text-red-500 transition-colors text-xs font-bold px-1"
                                    title="Clear filter"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-6 py-2.5 bg-white border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-50 transition-colors text-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* ACTIVE FILTER LABEL */}
                {selectedDate && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2B3440] text-white text-xs font-bold tracking-wider rounded-lg shadow-sm w-max">
                        <span className="animate-pulse">🟢</span> SHOWING OCCUPANCY FOR: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
                        {error}
                    </div>
                )}

                {!hasData ? (
                    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-stone-100">
                        <div className="text-stone-400 text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-bold text-stone-900">No confirmed bookings yet.</h3>
                        <p className="text-stone-500 mt-2">Charts will appear here once customers and managers start confirming camping reservations.</p>
                    </div>
                ) : (
                    <>
                        {/* SECTION 1 - KPI CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2">Total Confirmed Bookings</p>
                                    <p className="text-5xl font-black text-stone-900">{overview.totalBookings}</p>
                                </div>
                                <div className="text-[#25D366] text-5xl opacity-20">🏕️</div>
                            </div>
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2">Total Lifetime Guests</p>
                                    <p className="text-5xl font-black text-stone-900">{overview.totalGuests}</p>
                                </div>
                                <div className="text-[#3b82f6] text-5xl opacity-20">👥</div>
                            </div>
                        </div>

                        {/* CHARTS CONTAINER */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* SECTION 2 - VEG VS NON-VEG */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 col-span-1">
                                <h3 className="text-lg font-bold text-stone-900 mb-6">Food Preferences</h3>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={foodData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {foodData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-4">
                                    {foodData.map((item, index) => (
                                        <div key={item.name} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-sm text-stone-600 font-medium">{item.name} ({item.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SECTION 3 - PACKAGE POPULARITY */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 col-span-2">
                                <h3 className="text-lg font-bold text-stone-900 mb-6">Package Popularity</h3>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={packageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4 - MONTHLY TREND */}
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
                            <h3 className="text-lg font-bold text-stone-900 mb-6">Monthly Booking Trends</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                        <Line type="monotone" dataKey="bookings" stroke="#25D366" strokeWidth={3} dot={{ fill: '#25D366', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default OwnerDashboard;
