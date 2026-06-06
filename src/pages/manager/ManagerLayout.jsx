import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    CalendarCheck,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    Tent,
    LineChart
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/manager' },
    { id: 'properties', label: 'Properties', icon: Building2, path: '/manager/properties' },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck, path: '/manager/bookings' },
    { id: 'revenue', label: 'Revenue', icon: LineChart, path: '/manager/revenue' },
    { id: 'owners', label: 'Owners', icon: Users, path: '/manager/owners' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/manager/settings' },
];

const ManagerLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Check auth on mount and subscribe to push notifications
    useEffect(() => {
        const token = localStorage.getItem('managerToken');
        if (!token) {
            navigate('/manager/login');
            return;
        }

        const subscribeUserToPush = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            
            try {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') return;

                const registration = await navigator.serviceWorker.ready;
                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) return; // Already subscribed

                const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                if (!vapidPublicKey) return;

                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });

                // Send subscription to backend
                await fetch(`${import.meta.env.VITE_API_URL || ''}/api/notifications/subscribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(subscription)
                });
            } catch (error) {
                console.error('Error subscribing to push notifications:', error);
            }
        };

        // Utility to convert VAPID key
        function urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        }

        subscribeUserToPush();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('managerToken');
        navigate('/manager/login');
    };

    const getActiveNav = () => {
        const path = location.pathname;
        if (path === '/manager' || path === '/manager/') return 'dashboard';
        for (const item of NAV_ITEMS) {
            if (item.path !== '/manager' && path.startsWith(item.path)) return item.id;
        }
        return 'dashboard';
    };

    const activeNav = getActiveNav();

    return (
        <div className="min-h-screen bg-[#f5f5f4] flex">
            {/* MOBILE OVERLAY */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* SIDEBAR */}
            <aside className={`
                fixed top-0 left-0 h-full w-[280px] bg-white border-r border-stone-200/80 z-50
                flex flex-col transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:z-auto
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* BRAND HEADER */}
                <div className="h-[72px] flex items-center justify-between px-6 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                            <Tent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-[15px] font-bold text-stone-900 tracking-tight leading-none">Lonavala</h1>
                            <p className="text-[11px] text-stone-400 font-medium tracking-wide">MANAGER PORTAL</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* NAV LINKS */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all duration-200 group
                                    ${isActive
                                        ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50'
                                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                                    }
                                `}
                            >
                                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-stone-400 group-hover:text-stone-500'}`} />
                                <span className="flex-1 text-left">{item.label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 text-emerald-400" />}
                            </button>
                        );
                    })}
                </nav>

                {/* LOGOUT */}
                <div className="p-3 border-t border-stone-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                    >
                        <LogOut className="w-[18px] h-[18px] text-stone-400 group-hover:text-red-500" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">
                {/* TOP BAR (mobile) */}
                <header className="h-[72px] bg-white border-b border-stone-200/80 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="hidden lg:flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-stone-800 capitalize">{activeNav}</h2>
                    </div>

                    <div className="lg:hidden flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <Tent className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold text-stone-800">Lonavala Manager</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
                            <span className="text-xs font-bold text-stone-600">M</span>
                        </div>
                    </div>
                </header>

                {/* PAGE CONTENT */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
                    {children}
                </main>
            </div>

            {/* BOTTOM NAV (mobile only) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                {NAV_ITEMS.map(item => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center py-2.5 px-3 gap-1 min-w-[64px] transition-colors ${isActive ? 'text-emerald-600' : 'text-stone-400 hover:text-stone-600'}`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-stone-400'}`} />
                            <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-emerald-700 font-bold' : ''}`}>{item.label}</span>
                        </button>
                    )
                })}
            </nav>
        </div>
    );
};

export default ManagerLayout;
