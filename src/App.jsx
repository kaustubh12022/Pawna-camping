import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';
import WhatsAppButton from './components/WhatsAppButton';
import Hero from './components/Hero';
import PropertiesListing from './components/PropertiesListing';
import About from './components/About';
import Reviews from './components/Reviews';
import Gallery from './components/Gallery';
import Footer from './components/Footer';
import SaleBanner from './components/SaleBanner';
import PWAInstallButton from './components/PWAInstallButton';
import ProtectedRoute, { isTokenValid } from './components/ProtectedRoute';
import { PromotionProvider } from './context/PromotionContext';
import { ToastProvider } from './context/ToastContext';

// Lazy loaded pages for performance (Code Splitting)
const BookingPage = React.lazy(() => import('./pages/BookingPage'));
const CampsiteDetail = React.lazy(() => import('./pages/CampsiteDetail'));
const VillaDetail = React.lazy(() => import('./pages/VillaDetail'));

const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const RefundPolicy = React.lazy(() => import('./pages/RefundPolicy'));

const ManagerLogin = React.lazy(() => import('./pages/ManagerLogin'));
const ManagerLayout = React.lazy(() => import('./pages/manager/ManagerLayout'));
const DashboardHome = React.lazy(() => import('./pages/manager/DashboardHome'));
const PropertyManagement = React.lazy(() => import('./pages/manager/PropertyManagement'));
const CreateProperty = React.lazy(() => import('./pages/manager/CreateProperty'));
const PropertyDetail = React.lazy(() => import('./pages/manager/PropertyDetail'));
const PackageManagement = React.lazy(() => import('./pages/manager/PackageManagement'));
const BookingManagement = React.lazy(() => import('./pages/manager/BookingManagement'));
const OwnerManagement = React.lazy(() => import('./pages/manager/OwnerManagement'));
const RevenueManagement = React.lazy(() => import('./pages/manager/RevenueManagement'));
const SettingsPage = React.lazy(() => import('./pages/manager/SettingsPage'));
const ReviewManagement = React.lazy(() => import('./pages/manager/ReviewManagement'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const OwnerLogin = React.lazy(() => import('./pages/OwnerLogin'));
const OwnerDashboard = React.lazy(() => import('./pages/OwnerDashboard'));
const ChangePassword = React.lazy(() => import('./pages/ChangePassword'));

const PUBLIC_ROUTE_PREFIXES = ['/', '/campsite/', '/villa/', '/booking', '/privacy', '/terms', '/refund'];

const PublicSite = () => (
  <main className="min-h-screen bg-[var(--listing-bg)] transition-colors duration-500">
    <SaleBanner />
    <Hero />
    <PropertiesListing />
    <About />
    <Reviews />
    <Gallery />
    <Footer />
  </main>
);

// Conditionally render WhatsApp only on public routes
const ConditionalWhatsApp = () => {
  const { pathname } = useLocation();
  const isPublic = PUBLIC_ROUTE_PREFIXES.some(prefix =>
    prefix === '/' ? pathname === '/' : pathname.startsWith(prefix)
  );
  return isPublic ? <WhatsAppButton /> : null;
};

// Smoothly scrolls to target DOM anchor when hash is present in URL,
// or resets scroll to top when navigating to a non-hash route.
const ScrollToAnchor = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '');
      const scrollToElement = () => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      if (!scrollToElement()) {
        const timeoutIds = [50, 150, 300].map(delay =>
          setTimeout(scrollToElement, delay)
        );
        return () => timeoutIds.forEach(clearTimeout);
      }
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
};

// Redirect PWA users to their respective dashboards if they have a valid token
const PWARedirect = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.pathname !== '/') return;

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone || document.referrer.includes('android-app://');
        
        if (isStandalone) {
            const managerToken = localStorage.getItem('managerToken');
            const ownerToken = localStorage.getItem('ownerToken');
            
            if (managerToken && isTokenValid(managerToken)) {
                navigate('/manager');
            } else if (ownerToken && isTokenValid(ownerToken)) {
                navigate('/owner');
            }
        }
    }, [location.pathname, navigate]);

    return null;
};

function App() {
  return (
    <ErrorBoundary>
      <PromotionProvider>
        <Router>
          <ToastProvider>
            <ScrollToAnchor />
            <PWARedirect />
            <ConditionalWhatsApp />
            <PWAInstallButton />

            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* PUBLIC FACING WEBSITE */}
                <Route path="/" element={<PublicSite />} />
                <Route path="/campsite/:slug" element={<CampsiteDetail />} />
                <Route path="/villa/:slug" element={<VillaDetail />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/refund" element={<RefundPolicy />} />

                {/* DEDICATED BOOKING PAGE */}
                <Route path="/booking" element={<BookingPage />} />

                {/* MANAGER LOGIN (standalone, no sidebar) */}
                <Route path="/manager/login" element={<ManagerLogin />} />

                {/* FORCED PASSWORD CHANGE (any role, token required) */}
                <Route path="/change-password" element={<ChangePassword />} />

                {/* PROTECTED MANAGER PORTAL (with sidebar layout) */}
                <Route path="/manager" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><DashboardHome /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/properties" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><PropertyManagement /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/properties/new" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><CreateProperty /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/properties/:id" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><PropertyDetail /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/properties/:id/edit" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><CreateProperty /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/packages" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><PackageManagement /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/bookings" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><BookingManagement /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/revenue" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><RevenueManagement /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/owners" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><OwnerManagement /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/reviews" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><ReviewManagement /></ManagerLayout></ProtectedRoute>} />
                <Route path="/manager/settings" element={<ProtectedRoute allowedRole="manager"><ManagerLayout><SettingsPage /></ManagerLayout></ProtectedRoute>} />

                {/* OWNER PORTAL */}
                <Route path="/owner/login" element={<OwnerLogin />} />
                <Route path="/owner" element={<ProtectedRoute allowedRole="owner"><OwnerDashboard /></ProtectedRoute>} />

                {/* CATCH-ALL 404 ROUTE */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </Router>
      </PromotionProvider>
    </ErrorBoundary>
  );
}

export default App;
