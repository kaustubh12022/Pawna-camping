import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';
import ManagerPackages from '../components/ManagerPackages';

const COLORS = ['#25D366', '#f97316', '#3b82f6', '#8b5cf6'];

const OwnerDashboard = () => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [overview, setOverview] = useState({ totalBookings: 0, totalGuests: 0 });
    const [foodData, setFoodData] = useState([]);
    const [packageData, setPackageData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Feature 8: Confirmed Bookings Detail
    const [showConfirmedDetails, setShowConfirmedDetails] = useState(false);
    const [confirmedBookings, setConfirmedBookings] = useState([]);
    const [confirmedLoading, setConfirmedLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchAnalytics = async () => {
            const token = localStorage.getItem('ownerToken');

            if (!token) {
                navigate('/owner/login');
                return;
            }

            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const dateQuery = selectedDate ? `?date=${selectedDate}` : '';

                const [overviewRes, foodRes, packageRes, monthlyRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/api/analytics/overview${dateQuery}`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/api/analytics/food${dateQuery}`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/api/analytics/packages${dateQuery}`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/api/analytics/monthly`, { headers })
                ]);

                if (overviewRes.status === 401 || overviewRes.status === 403) {
                    localStorage.removeItem('ownerToken');
                    return navigate('/owner/login');
                }

                if (!overviewRes.ok || !foodRes.ok || !packageRes.ok || !monthlyRes.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

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

    // Feature 8: Fetch confirmed bookings when clicked
    const fetchConfirmedBookings = async () => {
        setConfirmedLoading(true);
        const token = localStorage.getItem('ownerToken');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch bookings');

            const allBookings = await response.json();
            const confirmed = allBookings.filter(b => {
                if (b.status !== 'confirmed') return false;
                if (!selectedDate) return true;
                // Show bookings whose stay overlaps the selected date
                const selDate = new Date(selectedDate);
                const checkIn = new Date(b.checkIn);
                const checkOut = new Date(b.checkOut);
                return selDate >= new Date(checkIn.toISOString().split('T')[0]) && selDate < new Date(checkOut.toISOString().split('T')[0]);
            });
            setConfirmedBookings(confirmed);
            setShowConfirmedDetails(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setConfirmedLoading(false);
        }
    };

    const handleShowConfirmedBookings = () => {
        if (showConfirmedDetails) {
            setShowConfirmedDetails(false);
            return;
        }
        fetchConfirmedBookings();
    };

    // Auto-refresh confirmed bookings when date changes and detail view is open
    useEffect(() => {
        if (showConfirmedDetails) {
            fetchConfirmedBookings();
        }
    }, [selectedDate]);

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

                        <div className="flex bg-stone-100 p-1 rounded-xl sm:mr-4">
                            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Analytics</button>
                            <button onClick={() => setActiveTab('packages')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'packages' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Packages</button>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="px-6 py-2.5 bg-white border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-50 transition-colors text-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {activeTab === 'packages' && (
                    <ManagerPackages tokenKey="ownerToken" />
                )}

                {activeTab === 'analytics' && (
                    <>

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
                                    {/* CLICKABLE: Total Confirmed Bookings */}
                                    <div
                                        onClick={handleShowConfirmedBookings}
                                        className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-between cursor-pointer hover:shadow-lg hover:border-[#25D366]/30 transition-all group"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                Total Confirmed Bookings
                                                <span className="text-xs font-medium text-[#25D366] bg-[#25D366]/10 px-2 py-0.5 rounded-full group-hover:bg-[#25D366]/20 transition-colors">
                                                    {showConfirmedDetails ? 'Hide Details' : 'View Details →'}
                                                </span>
                                            </p>
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

                                {/* FEATURE 8: CONFIRMED BOOKINGS DETAIL TABLE */}
                                {showConfirmedDetails && (
                                    <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                                        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-stone-900">Confirmed Bookings — Full Details</h3>
                                                <p className="text-sm text-stone-500 mt-1">{confirmedBookings.length} confirmed booking{confirmedBookings.length !== 1 ? 's' : ''}</p>
                                            </div>
                                            <button
                                                onClick={() => setShowConfirmedDetails(false)}
                                                className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                                            >
                                                Back to Overview
                                            </button>
                                        </div>

                                        {confirmedLoading ? (
                                            <div className="p-12 text-center">
                                                <div className="w-6 h-6 border-3 border-[#25D366] border-t-transparent rounded-full animate-spin mx-auto"></div>
                                            </div>
                                        ) : confirmedBookings.length === 0 ? (
                                            <div className="p-12 text-center text-stone-500">No confirmed bookings found.</div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 font-medium tracking-wide uppercase text-xs">
                                                        <tr>
                                                            <th className="px-6 py-4">Guest Name</th>
                                                            <th className="px-6 py-4">People</th>
                                                            <th className="px-6 py-4">Package</th>
                                                            <th className="px-6 py-4">Dates</th>
                                                            <th className="px-6 py-4">Nights</th>
                                                            <th className="px-6 py-4">Food Preference</th>
                                                            <th className="px-6 py-4">Phone</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-stone-100">
                                                        {confirmedBookings.map((booking) => (
                                                            <tr key={booking._id} className="hover:bg-stone-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="font-semibold text-stone-900">{booking.customerName}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700">
                                                                        {booking.guests} Guest{booking.guests !== 1 ? 's' : ''}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="font-medium text-stone-700">{booking.packageType}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-stone-700">{new Date(booking.checkIn).toLocaleDateString()} → {new Date(booking.checkOut).toLocaleDateString()}</div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="font-medium text-stone-700">{booking.nights}</span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col gap-1">
                                                                        {booking.vegGuests > 0 && (
                                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 w-max">
                                                                                🥗 {booking.vegGuests} Veg
                                                                            </span>
                                                                        )}
                                                                        {booking.nonVegGuests > 0 && (
                                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 w-max">
                                                                                🍗 {booking.nonVegGuests} Non-Veg
                                                                            </span>
                                                                        )}
                                                                        {(booking.vegGuests === 0 && booking.nonVegGuests === 0 && booking.foodPreference) && (
                                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-700 w-max">
                                                                                {booking.foodPreference}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="text-stone-600">{booking.customerPhone}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

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

                    </>
                )}
            </div>
        </div>
    );
};

export default OwnerDashboard;
