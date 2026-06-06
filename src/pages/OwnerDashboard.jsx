import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid
} from 'recharts';
import {
    LayoutDashboard,
    CalendarCheck,
    Tent,
    MapPin,
    Users,
    ChevronDown,
    LogOut,
    Building2,
    PieChart as PieChartIcon
} from 'lucide-react';
import PackageManagement from './manager/PackageManagement';
import ManualInstallButton from '../components/ManualInstallButton';

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6'];
const API = import.meta.env.VITE_API_URL || '';

const OwnerDashboard = () => {
    const [activeTab, setActiveTab] = useState('analytics'); // analytics, packages, revenue
    const [ownerProfile, setOwnerProfile] = useState(null);
    const [selectedProperty, setSelectedProperty] = useState('all');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    // Analytics State
    const [overview, setOverview] = useState({ totalBookings: 0, totalGuests: 0 });
    const [foodData, setFoodData] = useState([]);
    const [packageData, setPackageData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Revenue State
    const [revenues, setRevenues] = useState([]);
    const [revenuesLoading, setRevenuesLoading] = useState(false);

    // Bookings State
    const [showConfirmedDetails, setShowConfirmedDetails] = useState(false);
    const [confirmedBookings, setConfirmedBookings] = useState([]);
    const [confirmedLoading, setConfirmedLoading] = useState(false);

    const navigate = useNavigate();

    // Fetch Profile for properties list
    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('ownerToken');
            if (!token) return navigate('/owner/login');
            try {
                const res = await fetch(`${API}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setOwnerProfile(data);
                }
            } catch (err) {
                console.error("Failed to fetch owner profile", err);
            }
        };
        fetchProfile();
    }, [navigate]);

    // Fetch Analytics
    useEffect(() => {
        const fetchAnalytics = async () => {
            const token = localStorage.getItem('ownerToken');
            if (!token) return navigate('/owner/login');

            setIsLoading(true);
            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const dateQuery = selectedDate ? `?date=${selectedDate}` : '';
                const propQuery = selectedProperty !== 'all' ? (selectedDate ? `&propertyId=${selectedProperty}` : `?propertyId=${selectedProperty}`) : '';
                
                // Monthly trends doesn't use date filter
                const monthlyPropQuery = selectedProperty !== 'all' ? `?propertyId=${selectedProperty}` : '';

                const [overviewRes, foodRes, packageRes, monthlyRes] = await Promise.all([
                    fetch(`${API}/api/analytics/overview${dateQuery}${propQuery}`, { headers }),
                    fetch(`${API}/api/analytics/food${dateQuery}${propQuery}`, { headers }),
                    fetch(`${API}/api/analytics/packages${dateQuery}${propQuery}`, { headers }),
                    fetch(`${API}/api/analytics/monthly${monthlyPropQuery}`, { headers })
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
    }, [navigate, selectedDate, selectedProperty]);

    // Fetch Revenue
    useEffect(() => {
        if (activeTab !== 'revenue') return;
        const fetchOwnerRevenue = async () => {
            setRevenuesLoading(true);
            const token = localStorage.getItem('ownerToken');
            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const dateQuery = selectedDate ? `?date=${selectedDate}` : '';
                const propQuery = selectedProperty !== 'all' ? (selectedDate ? `&propertyId=${selectedProperty}` : `?propertyId=${selectedProperty}`) : '';
                
                const res = await fetch(`${API}/api/analytics/owner-revenue${dateQuery}${propQuery}`, { headers });
                if (res.ok) {
                    setRevenues(await res.json());
                }
            } catch (err) {
                console.error(err);
            } finally {
                setRevenuesLoading(false);
            }
        };
        fetchOwnerRevenue();
    }, [activeTab, selectedDate, selectedProperty]);

    // Fetch Bookings
    const fetchConfirmedBookings = async () => {
        setConfirmedLoading(true);
        const token = localStorage.getItem('ownerToken');
        try {
            let queryStr = selectedProperty !== 'all' ? `?propertyId=${selectedProperty}` : '';
            const response = await fetch(`${API}/api/bookings${queryStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch bookings');

            const allBookings = await response.json();
            // Show all bookings that are not cancelled
            let filtered = allBookings.filter(b => b.status !== 'cancelled');
            if (selectedDate) {
                const selDate = new Date(selectedDate);
                filtered = filtered.filter(b => {
                    const checkIn = new Date(b.checkIn);
                    const checkOut = new Date(b.checkOut);
                    return selDate >= new Date(checkIn.toISOString().split('T')[0]) && 
                           selDate < new Date(checkOut.toISOString().split('T')[0]);
                });
            }
            setConfirmedBookings(filtered);
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

    const handleOwnerResponse = async (bookingId, status) => {
        const token = localStorage.getItem('ownerToken');
        if (!token) return;

        let notes = '';
        if (status === 'rejected') {
            notes = window.prompt("Reason for rejection (optional):");
            if (notes === null) return;
        } else {
            if (!window.confirm("Are you sure you want to accept this booking?")) return;
        }

        try {
            const res = await fetch(`${API}/api/bookings/${bookingId}/owner-response`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, notes })
            });

            if (res.ok) {
                const updatedBooking = await res.json();
                setConfirmedBookings(prev => prev.map(b => b._id === bookingId ? updatedBooking : b).filter(b => b.status !== 'cancelled'));
            } else {
                const data = await res.json();
                alert(data.message || "Failed to update booking response");
            }
        } catch (err) {
            console.error(err);
            alert("Error updating booking response");
        }
    };

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
    const currentPropertyObj = selectedProperty === 'all' 
        ? null 
        : ownerProfile?.properties?.find(p => p._id === selectedProperty);
    const currentPropertyName = currentPropertyObj ? currentPropertyObj.name : 'All Properties';

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex flex-col">
            {/* TOP NAVBAR */}
            <header className="bg-white border-b border-stone-200/80 sticky top-0 z-40 px-4 py-3 lg:h-[72px] lg:py-0 lg:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[15px] font-bold text-stone-900 tracking-tight leading-none">Pawna Owner</h1>
                            <p className="text-[11px] text-stone-400 font-medium tracking-wide mt-0.5">Welcome, {ownerProfile?.name || 'Owner'}</p>
                        </div>
                    </div>
                    {/* Logout on mobile is moved here for better layout */}
                    <div className="lg:hidden flex items-center gap-2">
                        <ManualInstallButton />
                        <button
                            onClick={handleLogout}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto mt-4 lg:mt-0">
                    {/* PROPERTY SELECTOR */}
                    <div className="relative w-full lg:w-auto">
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="w-full flex justify-between items-center gap-2 bg-stone-50 border border-stone-200 hover:bg-stone-100 transition-colors px-4 py-2.5 rounded-xl text-sm font-bold text-stone-700"
                        >
                            <div className="flex items-center gap-2 truncate">
                                <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <span className="truncate">{currentPropertyName}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-stone-400 ml-1 flex-shrink-0" />
                        </button>
                        
                        {/* PHASE 5: Z-INDEX FIX */}
                        {dropdownOpen && (
                            <div className="absolute right-0 left-0 lg:left-auto top-full mt-2 lg:w-64 bg-white border border-stone-100 shadow-xl rounded-xl overflow-hidden py-1 z-[60]">
                                <button
                                    onClick={() => { setSelectedProperty('all'); setDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${selectedProperty === 'all' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
                                >
                                    All Properties
                                </button>
                                {ownerProfile?.properties?.map(p => (
                                    <button
                                        key={p._id}
                                        onClick={() => { setSelectedProperty(p._id); setDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${selectedProperty === p._id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}
                                    >
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                        <ManualInstallButton />
                        <button
                            onClick={handleLogout}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
                {/* PHASE 5: HERO SECTION */}
                {selectedProperty !== 'all' && currentPropertyObj ? (
                    /* SINGLE PROPERTY HERO */
                    <div className="relative h-64 lg:h-72 w-full mb-6 bg-stone-900">
                        <img 
                            src={currentPropertyObj?.coverImage?.url || '/about.jpg'} 
                            alt={currentPropertyObj.name}
                            className="w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10 max-w-7xl mx-auto flex flex-col gap-2">
                            <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-sm w-fit">
                                {currentPropertyObj.type || 'Property'}
                            </span>
                            <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
                                {currentPropertyObj.name}
                            </h2>
                            {currentPropertyObj.address && (
                                <p className="text-emerald-50 flex items-center gap-2 text-sm font-medium drop-shadow-md">
                                    <MapPin className="w-4 h-4 text-emerald-400" />
                                    {currentPropertyObj.address}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ALL PROPERTIES — show property cards */
                    <div className="w-full mb-6 px-4 lg:px-8 pt-6 max-w-7xl mx-auto">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Your Properties</p>
                        {!ownerProfile?.properties?.length ? (
                            <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center text-stone-400 text-sm">
                                No properties assigned yet. Contact your manager.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ownerProfile.properties.map(p => (
                                    <button
                                        key={p._id}
                                        onClick={() => setSelectedProperty(p._id)}
                                        className="group relative rounded-2xl overflow-hidden h-44 bg-stone-800 text-left hover:ring-2 hover:ring-emerald-500 transition-all shadow-sm hover:shadow-xl"
                                    >
                                        <img
                                            src={p.coverImage?.url || '/about.jpg'}
                                            alt={p.name}
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider mb-1 ${p.type === 'villa' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                                {p.type}
                                            </span>
                                            <h3 className="text-base font-black text-white drop-shadow-md leading-tight">{p.name}</h3>
                                            {p.address && (
                                                <p className="text-xs text-white/70 mt-0.5 truncate">{p.address}</p>
                                            )}
                                        </div>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="bg-white text-stone-800 text-[10px] font-bold px-2 py-1 rounded-full">View →</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="max-w-7xl mx-auto space-y-8 px-4 lg:px-8">
                    {/* TABS & FILTERS */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex bg-stone-100 p-1 rounded-xl w-full sm:w-auto">
                            <button onClick={() => setActiveTab('analytics')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Analytics</button>
                            <button onClick={() => setActiveTab('packages')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'packages' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Packages</button>
                            <button onClick={() => setActiveTab('revenue')} className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'revenue' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>Revenue</button>
                        </div>

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
                    </div>

                    {activeTab === 'packages' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-6 lg:p-8">
                            <PackageManagement 
                                propertyId={selectedProperty !== 'all' ? selectedProperty : null} 
                            />
                        </div>
                    )}

                    {activeTab === 'revenue' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                            <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-emerald-600 text-sm font-bold uppercase tracking-wider mb-1">Total Earnings (Shown)</p>
                                    <p className="text-4xl font-black text-stone-900">₹{revenues.reduce((sum, r) => sum + (r.ownerEarnings || 0), 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 text-sm max-w-sm">
                                    <p className="font-medium text-stone-600">This shows your net earnings. Platform commission has already been deducted from these totals.</p>
                                </div>
                            </div>

                            {revenuesLoading ? (
                                <div className="p-12 flex justify-center">
                                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : revenues.length === 0 ? (
                                <div className="p-16 flex flex-col items-center justify-center text-stone-400">
                                    <PieChartIcon className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="font-bold text-stone-500">No revenue entries found.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-stone-50 text-stone-500 font-medium tracking-wide uppercase text-[10px]">
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Property</th>
                                                <th className="px-6 py-4">Guest</th>
                                                <th className="px-6 py-4">Net Earning</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {revenues.map((rev) => (
                                                <tr key={rev._id} className="hover:bg-stone-50/50">
                                                    <td className="px-6 py-4 font-medium text-stone-900">
                                                        {new Date(rev.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-stone-600">{rev.property?.name || 'Unknown'}</td>
                                                    <td className="px-6 py-4 text-stone-600">{rev.booking?.customerName || '-'}</td>
                                                    <td className="px-6 py-4 font-bold text-emerald-600">₹{rev.ownerEarnings?.toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <>
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
                                    <h3 className="text-xl font-bold text-stone-900">No bookings yet.</h3>
                                    <p className="text-stone-500 mt-2">Charts will appear here once bookings are received.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div
                                            onClick={handleShowConfirmedBookings}
                                            className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-between cursor-pointer hover:shadow-lg hover:border-emerald-500/30 transition-all group"
                                        >
                                            <div>
                                                <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    Total Bookings
                                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full group-hover:bg-emerald-100 transition-colors">
                                                        {showConfirmedDetails ? 'Hide Details' : 'View Details →'}
                                                    </span>
                                                </p>
                                                <p className="text-5xl font-black text-stone-900">{overview.totalBookings}</p>
                                            </div>
                                            <div className="text-emerald-500 text-5xl opacity-20">🏕️</div>
                                        </div>
                                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-2">Total Lifetime Guests</p>
                                                <p className="text-5xl font-black text-stone-900">{overview.totalGuests}</p>
                                            </div>
                                            <div className="text-blue-500 text-5xl opacity-20">👥</div>
                                        </div>
                                    </div>

                                    {/* PHASE 5: BOOKINGS DETAIL TABLE WITH OWNER RESPONSE */}
                                    {showConfirmedDetails && (
                                        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
                                            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-stone-900">Bookings — Full Details</h3>
                                                    <p className="text-sm text-stone-500 mt-1">{confirmedBookings.length} booking{confirmedBookings.length !== 1 ? 's' : ''}</p>
                                                </div>
                                                <button
                                                    onClick={() => setShowConfirmedDetails(false)}
                                                    className="px-4 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                                                >
                                                    Close
                                                </button>
                                            </div>

                                            {confirmedLoading ? (
                                                <div className="p-12 text-center">
                                                    <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                        <thead className="bg-stone-50 text-stone-500 font-medium tracking-wide uppercase text-[10px]">
                                                            <tr>
                                                                <th className="px-6 py-4">Guest Name</th>
                                                                <th className="px-6 py-4">People</th>
                                                                <th className="px-6 py-4">Dates & Package</th>
                                                                <th className="px-6 py-4">Status & Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-stone-100">
                                                            {confirmedBookings.map((booking) => (
                                                                <tr key={booking._id} className="hover:bg-stone-50/50">
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-semibold text-stone-900">{booking.customerName}</div>
                                                                        <div className="text-xs text-stone-500 mt-1">{booking.customerPhone}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                                                                            {booking.guests} Guest{booking.guests !== 1 ? 's' : ''}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="text-stone-700 font-medium">
                                                                            {new Date(booking.checkIn).toLocaleDateString()} → {new Date(booking.checkOut).toLocaleDateString()}
                                                                        </div>
                                                                        <div className="text-xs text-stone-500 mt-1">{booking.packageType} ({booking.nights}N)</div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex flex-col gap-2">
                                                                            {/* Booking Status */}
                                                                            {booking.status === 'confirmed' ? (
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 w-max">
                                                                                    Confirmed
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 w-max">
                                                                                    Pending
                                                                                </span>
                                                                            )}
                                                                            
                                                                            {/* Owner Response Actions */}
                                                                            {booking.ownerResponse?.status === 'pending' && booking.status === 'pending' && (
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <button 
                                                                                        onClick={() => handleOwnerResponse(booking._id, 'accepted')}
                                                                                        className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition-colors"
                                                                                    >
                                                                                        Accept
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => handleOwnerResponse(booking._id, 'rejected')}
                                                                                        className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded hover:bg-red-200 transition-colors"
                                                                                    >
                                                                                        Reject
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {booking.ownerResponse?.status === 'accepted' && (
                                                                                <span className="text-[10px] font-medium text-emerald-600">✓ You Accepted</span>
                                                                            )}
                                                                        </div>
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
                                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 col-span-1">
                                            <h3 className="text-lg font-bold text-stone-900 mb-6">Food Preferences</h3>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie data={foodData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                            {foodData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <RechartsTooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

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

                                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
                                        <h3 className="text-lg font-bold text-stone-900 mb-6">Monthly Booking Trends</h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                    <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                    <Line type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OwnerDashboard;
