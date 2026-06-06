import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-[#fafafa] py-24 px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm">
                <Link to="/" className="text-stone-500 hover:text-stone-900 transition-colors mb-8 inline-block text-sm font-medium tracking-widest uppercase">&larr; Back to Home</Link>
                <h1 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-8 tracking-tight">Privacy Policy</h1>
                <div className="prose prose-stone max-w-none text-stone-600 font-light leading-relaxed">
                    <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">1. Information We Collect</h2>
                    <p className="mb-4">We collect information that you provide directly to us when you make a booking, create an account, or contact us for support. This may include your name, email address, phone number, and payment information.</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">2. How We Use Your Information</h2>
                    <p className="mb-4">We use the information we collect to provide, maintain, and improve our services, to process your transactions, and to send you related information including confirmations and receipts.</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">3. Information Sharing</h2>
                    <p className="mb-4">We do not share your personal information with third parties except as necessary to provide our services, comply with the law, or protect our rights.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
