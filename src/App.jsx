import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Hero from './components/Hero';
import Packages from './components/Packages';
import About from './components/About';
import Booking from './components/Booking';
import Footer from './components/Footer';
import ManagerLogin from './pages/ManagerLogin';
import ManagerDashboard from './pages/ManagerDashboard';
import OwnerLogin from './pages/OwnerLogin';
import OwnerDashboard from './pages/OwnerDashboard';

const PublicSite = () => (
  <main className="min-h-screen bg-[#fafafa]">
    <Hero />
    <Packages />
    <About />
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
