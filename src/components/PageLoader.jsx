import React from 'react';

const PageLoader = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-stone-500 font-bold tracking-widest text-sm animate-pulse">LOADING PAWNA EXPERIENCE...</p>
    </div>
  );
};

export default PageLoader;
