import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Hero from './components/Hero';
import Packages from './components/Packages';
import About from './components/About';
import Gallery from './components/Gallery';
import Booking from './components/Booking';
import Footer from './components/Footer';
import ManagerLogin from './pages/ManagerLogin';
import ManagerDashboard from './pages/ManagerDashboard';
import OwnerLogin from './pages/OwnerLogin';
import OwnerDashboard from './pages/OwnerDashboard';
import PackagePage from './pages/PackagePage';

const PublicSite = () => (
  <main className="min-h-screen bg-[#fafafa]">
    <Hero />
    <Packages />
    <About />
    <Gallery />
    <Booking />
    <Footer />
  </main>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* PUBLIC FACING WEBSITE */}
        <Route path="/" element={<PublicSite />} />

        {/* PACKAGE PRODUCT PAGES */}
        <Route path="/package/:slug" element={<PackagePage />} />

        {/* PROTECTED MANAGER DASHBOARD */}
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/manager" element={<ManagerDashboard />} />

        {/* PROTECTED OWNER ANALYTICS DASHBOARD */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner" element={<OwnerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
