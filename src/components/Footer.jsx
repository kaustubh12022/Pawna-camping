const Footer = () => {
    return (
        <footer className="bg-stone-900 text-stone-400 py-16 md:py-20 px-6 lg:px-8">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 border-b border-stone-800 pb-16 mb-8">

                <div className="lg:col-span-1">
                    <h2 className="text-2xl font-semibold text-white mb-6 font-serif italic">Pawna</h2>
                    <p className="font-light text-sm leading-relaxed max-w-xs">
                        Premium camping experiences by Pawna Lake. Disconnect to reconnect.
                    </p>
                </div>

                <div>
                    <h3 className="text-white text-sm font-medium tracking-widest uppercase mb-6">Explore</h3>
                    <ul className="space-y-4 font-light text-sm">
                        <li><a href="#" className="hover:text-white transition-colors">Accommodations</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Our Story</a></li>
                        <li><a href="#booking" className="hover:text-white transition-colors">Book a Stay</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Gallery</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-white text-sm font-medium tracking-widest uppercase mb-6">Contact</h3>
                    <ul className="space-y-4 font-light text-sm">
                        <li>hello@pawnacamp.com</li>
                        <li>+91 98765 43210</li>
                        <li>Pawna Lake Road, <br />Lonavala, Maharashtra</li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-white text-sm font-medium tracking-widest uppercase mb-6">Follow Us</h3>
                    <ul className="space-y-4 font-light text-sm">
                        <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Facebook</a></li>
                        <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-xs font-light">
                <p>&copy; {new Date().getFullYear()} Pawna Camping. All rights reserved.</p>
                <div className="flex gap-6 mt-4 md:mt-0">
                    <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
