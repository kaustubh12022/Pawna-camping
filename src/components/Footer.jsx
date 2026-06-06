import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-gradient-to-b from-stone-800 to-stone-950 text-stone-400 py-16 md:py-20 px-6 lg:px-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 border-b border-stone-700/50 pb-16 mb-8">

                <div className="lg:col-span-1">
                    <h2 className="text-2xl font-semibold text-white mb-6 font-serif italic">Lonavala Stays</h2>
                    <p className="font-light text-sm leading-relaxed max-w-xs">
                        Premium campsites and luxury villas in Lonavala. Disconnect from the city to reconnect with nature.
                    </p>
                </div>

                <div>
                    <h3 className="text-white text-sm font-medium tracking-widest uppercase mb-6">Explore</h3>
                    <ul className="space-y-4 font-light text-sm">
                        <li><a href="/#properties" className="hover:text-white transition-colors">Accommodations</a></li>
                        <li><a href="/#about" className="hover:text-white transition-colors">Our Story</a></li>
                        <li><Link to="/booking" className="hover:text-white transition-colors">Book a Stay</Link></li>
                        <li><a href="/#gallery" className="hover:text-white transition-colors">Gallery</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-white text-sm font-medium tracking-widest uppercase mb-6">Contact</h3>
                    <ul className="space-y-4 font-light text-sm">
                        <li>hello@lonavalastays.com</li>
                        <li>+91 98765 43210</li>
                        <li>Lonavala, <br />Maharashtra 410401</li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-white text-sm font-medium tracking-widest uppercase mb-6">Follow Us</h3>
                    <div className="flex gap-4">
                        <a href="#" className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center hover:bg-stone-700 hover:text-white transition-colors"><Instagram size={18} /></a>
                        <a href="#" className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center hover:bg-stone-700 hover:text-white transition-colors"><Facebook size={18} /></a>
                        <a href="#" className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center hover:bg-stone-700 hover:text-white transition-colors"><Twitter size={18} /></a>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs font-light">
                <p>&copy; {new Date().getFullYear()} Lonavala Stays. All rights reserved.</p>
                <div className="flex flex-wrap gap-4 md:gap-6 mt-4 md:mt-0 justify-center">
                    <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                    <Link to="/refund" className="hover:text-white transition-colors">Refund Policy</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
