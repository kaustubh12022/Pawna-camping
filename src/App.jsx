import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
const BookingManagement = React.lazy(() => import('./pages/manager/BookingManagement'));
const OwnerManagement = React.lazy(() => import('./pages/manager/OwnerManagement'));
const RevenueManagement = React.lazy(() => import('./pages/manager/RevenueManagement'));
const SettingsPage = React.lazy(() => import('./pages/manager/SettingsPage'));

const OwnerLogin = React.lazy(() => import('./pages/OwnerLogin'));
const OwnerDashboard = React.lazy(() => import('./pages/OwnerDashboard'));

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

function App() {
  return (
    <ErrorBoundary>
      <Router>
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

            {/* PHASE 5/6: MANAGER PORTAL (with sidebar layout) */}
            <Route path="/manager" element={<ManagerLayout><DashboardHome /></ManagerLayout>} />
            <Route path="/manager/properties" element={<ManagerLayout><PropertyManagement /></ManagerLayout>} />
            <Route path="/manager/properties/new" element={<ManagerLayout><CreateProperty /></ManagerLayout>} />
            <Route path="/manager/properties/:id" element={<ManagerLayout><PropertyDetail /></ManagerLayout>} />
            <Route path="/manager/properties/:id/edit" element={<ManagerLayout><CreateProperty /></ManagerLayout>} />
            <Route path="/manager/bookings" element={<ManagerLayout><BookingManagement /></ManagerLayout>} />
            <Route path="/manager/revenue" element={<ManagerLayout><RevenueManagement /></ManagerLayout>} />
            <Route path="/manager/owners" element={<ManagerLayout><OwnerManagement /></ManagerLayout>} />
            <Route path="/manager/settings" element={<ManagerLayout><SettingsPage /></ManagerLayout>} />

            {/* PROTECTED OWNER ANALYTICS DASHBOARD */}
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route path="/owner" element={<OwnerDashboard />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

