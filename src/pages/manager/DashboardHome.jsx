import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    CalendarCheck,
    Clock,
    TrendingUp,
    Users,
    ArrowRight,
    Tent,
    Home,
    AlertCircle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

const DashboardHome = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalProperties: 0,
        activeProperties: 0,
        campsites: 0,
        villas: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        todayCheckIns: 0,
        totalOwners: 0,
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const getToken = () => localStorage.getItem('managerToken');

    const fetchDashboardData = async () => {
        const token = getToken();
        if (!token) return navigate('/manager/login');

        try {
            setIsLoading(true);
            setError(null);

            const headers = { Authorization: `Bearer ${token}` };

            // Single server-side aggregated call — no more fetch-all-and-count pattern
            const res = await fetch(`${API_URL}/api/dashboard/stats`, { headers });

            if (res.status === 401) {
                localStorage.removeItem('managerToken');
                return navigate('/manager/login');
            }

            if (!res.ok) throw new Error('Failed to load dashboard stats');

            const data = await res.json();

            setStats({
                totalProperties: data.properties.total,
                activeProperties: data.properties.active,
                campsites: data.properties.campsites,
                villas: data.properties.villas,
                pendingBookings: data.bookings.pending,
                confirmedBookings: data.bookings.confirmed,
                todayCheckIns: data.todayCheckIns,
                totalOwners: data.totalOwners,
            });

            // Recent bookings — already filtered to PENDING only, with property+owner populated
            setRecentBookings(data.recentPendingBookings || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-[140px] bg-white rounded-2xl border border-stone-100" />
                    ))}
                </div>
                <div className="h-[400px] bg-white rounded-2xl border border-stone-100" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* PAGE HEADER */}
            <div>
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Dashboard</h1>
                <p className="text-stone-500 text-sm mt-1">Welcome back. Here's your platform overview.</p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Total Properties */}
                <button
                    onClick={() => navigate('/manager/properties')}
                    className="bg-white rounded-2xl p-5 border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all duration-300 text-left group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{stats.totalProperties}</p>
                    <p className="text-sm text-stone-500 mt-0.5">Total Properties</p>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <Tent className="w-3 h-3" /> {stats.campsites}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
                            <Home className="w-3 h-3" /> {stats.villas}
                        </span>
                    </div>
                </button>

                {/* Pending Bookings */}
                <button
                    onClick={() => navigate('/manager/bookings')}
                    className="bg-white rounded-2xl p-5 border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all duration-300 text-left group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{stats.pendingBookings}</p>
                    <p className="text-sm text-stone-500 mt-0.5">Pending Bookings</p>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-green-50 text-green-700">
                            <CalendarCheck className="w-3 h-3" /> {stats.confirmedBookings} confirmed
                        </span>
                    </div>
                </button>

                {/* Today's Check-ins */}
                <div className="bg-white rounded-2xl p-5 border border-stone-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{stats.todayCheckIns}</p>
                    <p className="text-sm text-stone-500 mt-0.5">Today's Check-ins</p>
                    <p className="text-[11px] text-stone-400 mt-3">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                </div>

                {/* Total Owners */}
                <button
                    onClick={() => navigate('/manager/owners')}
                    className="bg-white rounded-2xl p-5 border border-stone-100 hover:border-stone-200 hover:shadow-md transition-all duration-300 text-left group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-3xl font-bold text-stone-900">{stats.totalOwners}</p>
                    <p className="text-sm text-stone-500 mt-0.5">Property Owners</p>
                    <p className="text-[11px] text-stone-400 mt-3">Manage ownership & access</p>
                </button>
            </div>

            {/* RECENT PENDING BOOKINGS TABLE */}
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                    <div>
                        <h3 className="text-[15px] font-semibold text-stone-800">Pending Bookings</h3>
                        <p className="text-xs text-stone-400 mt-0.5">Awaiting confirmation</p>
                    </div>
                    <button
                        onClick={() => navigate('/manager/bookings')}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
                    >
                        View All <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {recentBookings.length === 0 ? (
                    <div className="px-6 py-12 text-center text-stone-400 text-sm">
                        No pending bookings — all caught up! 🎉
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-stone-50/80 border-b border-stone-100 text-stone-500 text-xs font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Property</th>
                                    <th className="px-6 py-3">Owner</th>
                                    <th className="px-6 py-3">Check-in</th>
                                    <th className="px-6 py-3">Guests</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {recentBookings.map(booking => (
                                    <tr key={booking._id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="font-semibold text-stone-800">{booking.customerName}</div>
                                            <div className="text-xs text-stone-400 mt-0.5">{booking.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <div className="font-medium text-stone-700">
                                                {booking.property?.name || booking.packageType || '—'}
                                            </div>
                                            <div className="text-xs text-stone-400 mt-0.5 capitalize">
                                                {booking.propertyType || 'legacy'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-stone-500 text-sm">
                                            {booking.property?.owner?.name || '—'}
                                        </td>
                                        <td className="px-6 py-3.5 text-stone-600">
                                            {new Date(booking.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </td>
                                        <td className="px-6 py-3.5 text-stone-600">
                                            {booking.guests}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardHome;
