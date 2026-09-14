import React from 'react';
import { Link } from 'react-router-dom';

const Notfound = () => {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] top-10 -right-40 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] -bottom-20 -left-40 pointer-events-none" />

      <div className="text-center z-10 animate-fade-in">
        <h1 className="text-[10rem] md:text-[12rem] font-extrabold leading-none bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent mb-4 animate-float select-none">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">Page Not Found</h2>
        <p className="text-slate-400 max-w-md mx-auto mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/25 transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Notfound;
