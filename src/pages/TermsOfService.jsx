import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-[#fafafa] py-24 px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm">
                <Link to="/" className="text-stone-500 hover:text-stone-900 transition-colors mb-8 inline-block text-sm font-medium tracking-widest uppercase">&larr; Back to Home</Link>
                <h1 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-8 tracking-tight">Terms of Service</h1>
                <div className="prose prose-stone max-w-none text-stone-600 font-light leading-relaxed">
                    <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">1. Acceptance of Terms</h2>
                    <p className="mb-4">By accessing or using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">2. Booking Policies</h2>
                    <p className="mb-4">All bookings are subject to availability and confirmation. A booking request does not guarantee a reservation until explicitly confirmed by our team.</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">3. User Responsibilities</h2>
                    <p className="mb-4">Guests are expected to treat the properties, staff, and environment with respect. Any damage caused to the property may result in additional charges.</p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
