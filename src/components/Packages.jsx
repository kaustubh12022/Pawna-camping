import { motion } from 'framer-motion';

const packages = [
    {
        id: 'normal',
        title: 'Normal Tent',
        description: 'A classic lakeside camping experience under the stars. Perfect for adventure seekers.',
        features: ['Lakeside View', 'Common Washroom', 'BBQ Grill', 'Campfire'],
        price: '₹1,200',
        placeholder: 'NORMAL TENT IMAGE PLACEHOLDER',
        image: '/normal-tent.jpg'
    },
    {
        id: 'cottage',
        title: 'Cozy Cottage',
        description: 'Comfortable private cottages blending rustic charm with modern amenities.',
        features: ['Private Washroom', 'Comfortable Bed', 'Fan & Lights', 'Lake View Balcony'],
        price: '₹2,500',
        placeholder: 'COTTAGE IMAGE PLACEHOLDER',
        image: '/cottage.jpg'
    },
    {
        id: 'luxury',
        title: 'Luxury Cottage',
        description: 'The ultimate glamping experience. Indulge in premium comfort surrounded by nature.',
        features: ['AC Room', 'Luxurious Bath', 'Private Deck', 'Room Service'],
        price: '₹4,000',
        placeholder: 'LUXURY COTTAGE IMAGE PLACEHOLDER',
        image: '/luxury-cottage.webp'
    }
];

const Packages = () => {
    return (
        <section className="py-24 md:py-32 bg-[#fafafa] px-6 lg:px-8 border-b border-stone-100">
            <div className="max-w-7xl mx-auto">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <h2 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-6 tracking-tight">Stay With Us</h2>
                    <p className="text-stone-500 max-w-2xl mx-auto text-lg font-light">
                        Choose from our carefully curated accommodations designed to connect you with nature without compromising on comfort.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
                    {packages.map((pkg, index) => (
                        <motion.div
                            key={pkg.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.8, delay: index * 0.2 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)] transition-shadow duration-500 border border-stone-100 flex flex-col"
                        >
                            <div className="h-64 w-full bg-stone-200 relative overflow-hidden">
                                <img
                                    src={pkg.image}
                                    alt={pkg.title}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>

                            <div className="p-8 md:p-10 flex flex-col flex-grow">
                                <div className="mb-4 flex justify-between items-end">
                                    <h3 className="text-2xl font-medium text-stone-900">{pkg.title}</h3>
                                    <span className="text-lg font-medium text-stone-500">{pkg.price}<span className="text-sm font-light text-stone-400">/night</span></span>
                                </div>

                                <p className="text-stone-500 font-light mb-8 line-clamp-3">
                                    {pkg.description}
                                </p>

                                <ul className="space-y-3 mb-10 mt-auto">
                                    {pkg.features.map((feature, i) => (
                                        <li key={i} className="flex items-center text-sm text-stone-600 font-light">
                                            <svg className="w-4 h-4 mr-3 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('selectPackage', { detail: pkg.id }));
                                        document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="w-full py-4 text-sm font-medium tracking-wide text-stone-900 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors duration-300"
                                >
                                    SELECT PACKAGE
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Packages;
