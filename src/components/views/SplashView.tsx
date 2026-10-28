import React from 'react';
import { BopoiLogo } from '../brand/BopoiLogo.tsx';
import { useBopoi } from '../../context/BopoiContext.tsx';
import { ArrowRight } from 'lucide-react';

export const SplashView: React.FC = () => {
  const { setActiveView } = useBopoi();

  return (
    <div className="min-h-full flex flex-col justify-between bg-gradient-to-b from-[#3510B9] via-[#4314E2] to-[#5420F5] text-white p-6 relative overflow-hidden select-none">
      {/* Decorative background glow */}
      <div className="absolute top-10 right-0 w-64 h-64 bg-[#F52D85]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-64 h-64 bg-[#FFC928]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Logo & Branding */}
      <div className="flex flex-col items-center pt-8 text-center z-10">
        <BopoiLogo variant="icon" size="xl" className="mb-4 drop-shadow-xl" />
        <h1 className="text-4xl font-black tracking-tight text-white flex items-center justify-center">
          Bopo
          <span className="relative inline-block">
            ı
            <span className="absolute -top-1 right-0 w-2.5 h-2.5 bg-[#FFC928] rounded-full shadow-sm" />
          </span>
        </h1>
        <p className="text-sm font-medium text-white/80 mt-2 tracking-wide">
          Your Campus, All in One Place
        </p>
      </div>

      {/* Campus Students Illustration */}
      <div className="my-auto py-4 flex flex-col items-center justify-center z-10">
        <div className="relative w-full max-w-[310px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
          <img
            src="/src/assets/images/campus_students_group_1791990927948.jpg"
            alt="Campus students hanging out"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs text-white/90">
            <span className="font-semibold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">
              Uni Vibes
            </span>
            <span className="font-handwriting text-base text-[#FFC928]">
              #CampusLife
            </span>
          </div>
        </div>
      </div>

      {/* Bottom CTA actions */}
      <div className="flex flex-col gap-3 pb-4 z-10">
        <button
          onClick={() => setActiveView('onboarding')}
          className="w-full py-4 px-6 bg-white text-[#5420F5] font-bold text-base rounded-2xl shadow-lg shadow-black/20 hover:bg-[#F7F4FF] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveView('home')}
          className="w-full py-3 text-sm font-semibold text-white/80 hover:text-white transition-colors"
        >
          Explore Campus Feed
        </button>
      </div>
    </div>
  );
};
