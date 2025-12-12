import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onHomeClick: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onHomeClick }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={onHomeClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white">
              <BookOpen size={20} />
            </div>
            <span className="font-display font-semibold text-xl text-slate-800">TeachersDhost</span>
          </button>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
             <Sparkles size={14} className="text-amber-400" />
             <span>AI Assistant Ready</span>
          </div>
        </div>
      </header>
      
      <main className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="py-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} TeachersDhost. Built for educators.</p>
      </footer>
    </div>
  );
};