import React from 'react';
import { Link } from 'react-router-dom';

const RefundPolicy = () => {
    return (
        <div className="min-h-screen bg-[#fafafa] py-24 px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm">
                <Link to="/" className="text-stone-500 hover:text-stone-900 transition-colors mb-8 inline-block text-sm font-medium tracking-widest uppercase">&larr; Back to Home</Link>
                <h1 className="text-4xl md:text-5xl font-semibold text-stone-900 mb-8 tracking-tight">Refund Policy</h1>
                <div className="prose prose-stone max-w-none text-stone-600 font-light leading-relaxed">
                    <p className="mb-6">Last updated: {new Date().toLocaleDateString()}</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">1. Cancellation Policy</h2>
                    <p className="mb-4">Cancellations made 7 days or more prior to the check-in date will receive a full refund, minus any transaction fees.</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">2. Late Cancellations</h2>
                    <p className="mb-4">Cancellations made within 7 days of the check-in date are generally non-refundable. We may, at our discretion, offer date changes subject to availability.</p>
                    <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">3. No-Shows</h2>
                    <p className="mb-4">Failure to arrive for your scheduled booking will result in a 100% cancellation fee.</p>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicy;
