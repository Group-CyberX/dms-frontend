import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { SignatureModal } from './SignatureModal';
import { Great_Vibes, Playfair_Display, Inter } from 'next/font/google';

const cursiveFont = Great_Vibes({ weight: '400', subsets: ['latin'] });
const serifFont = Playfair_Display({ weight: '600', subsets: ['latin'] });
const sansFont = Inter({ weight: '500', subsets: ['latin'] });

interface Placement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  signatureUrl: string;
}

export const SignatureWorkspace: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);

  const handleAddToPage = () => {
    console.log("Add to Page 1 button was clicked!");
    const activeSignature = savedSignature || "TEXT:John Doe:cursive";

    const newPlacement: Placement = {
      id: `sig-${Date.now()}`,
      x: 280, 
      y: 450,
      width: 150,
      height: 60,
      signatureUrl: activeSignature
    };
    
    setPlacements([...placements, newPlacement]);
  };

  const removePlacement = (id: string) => {
    setPlacements(placements.filter(p => p.id !== id));
  };

  // Helper utility function to fetch loaded font config class tags dynamically
  const getFontClass = (styleTag: string) => {
    if (styleTag === 'serif') return serifFont.className;
    if (styleTag === 'sans') return sansFont.className;
    return cursiveFont.className;
  };

  return (
    <div className="flex h-screen w-full flex-col bg-[#F3F4F6] font-sans antialiased text-gray-800 overflow-hidden">
      
      {/* 1. TOP GLOBAL ACTION HEADER BAR */}
      <div 
        style={{ height: '65px' }} 
        className="w-full shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm z-20"
      >
        <div className="flex items-center gap-5">
          <button className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-medium p-1 hover:bg-slate-50 rounded-lg">
            ←
          </button>
          <div className="flex items-center gap-3.5">
            <span className="text-[#8B2E00] text-3xl">📄</span>
            <div>
              <h1 className="text-base font-bold text-gray-950 tracking-tight leading-tight">Invoice_Q1_2025.pdf</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Place your signatures, then sign & approve</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-slate-100 px-8 py-2 text-xs font-bold text-slate-600 tracking-wide">
            {placements.length} placements
          </span>
          <button className="rounded-lg border border-slate-200 px-8 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 bg-white transition shadow-sm">
            Cancel
          </button>
          <button className="rounded-lg bg-[#8B2E00] px-6 py-2 text-xs font-extrabold text-white hover:bg-[#722600] shadow-md transition-all tracking-wide">
            Save & Approve
          </button>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT: UTILITY SIDEBAR ON LEFT + CANVAS WORKSPACE */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. SIGNATURE UTILITY SIDEBAR */}
        <div 
          style={{ width: '300px' }} 
          className="border-r bg-white p-3 flex h-full flex-col justify-between shrink-0 overflow-y-auto overflow-x-hidden"
        >  
          <div className="space-y-4">
            <div className="px-2 py-2 flex items-center gap-2">
              <div className="h-10 w-10 rounded bg-[#8B2E00] text-white flex items-center justify-center text-sm font-bold shrink-0">
                ✍️
              </div>
              <div className="font-semibold text-sm text-[#8B2E00]">Your Signatures</div>
            </div>
            
            <div className="px-2 space-y-4">
              {!savedSignature ? (
                <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                  No signatures yet. Create one to start placing.
                </p>
              ) : (
                <div className="group relative rounded-lg border border-slate-100 bg-[#FAF9F6] p-4 flex items-center justify-center min-h-[90px] shadow-inner animate-in fade-in zoom-in-95 duration-200">
                  {savedSignature.startsWith('TEXT:') ? (
                    <span className={`text-2xl text-slate-800 ${getFontClass(savedSignature.split(':')[2])}`}>
                      {savedSignature.split(':')[1]}
                    </span>
                  ) : (
                    <img src={savedSignature} alt="Saved Signature" className="max-h-14 object-contain" />
                  )}
                </div>
              )}

              <div>
                {savedSignature && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">Options</p>}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white shadow-sm transition"
                >
                  <span className="text-sm">+</span> {savedSignature ? 'Change Signature' : 'Create Signature'}
                </button>
              </div>

              <button 
                onClick={handleAddToPage}
                className="w-full rounded-lg bg-[#8B2E00] hover:bg-[#722600] text-white py-2.5 text-xs font-bold shadow-md transition-all tracking-wide"
              >
                📄 Add to Page 1
              </button>

              {placements.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-2 px-1">All Placements</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {placements.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded border border-slate-100">
                        <span className="text-slate-500 font-medium">Page 1 ({Math.round(p.x)}, {Math.round(p.y)})</span>
                        <button onClick={() => removePlacement(p.id)} className="text-slate-400 hover:text-red-500 font-medium transition">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-2 border-t border-slate-100 pt-3 mb-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Drag the signature box to position it. Drag the corner to resize. You can place the same signature multiple times.
            </p>
          </div>
        </div>

        {/* 3. CENTER WORKSPACE CANVAS AREA FOR A4 DOCUMENT */}
        <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center bg-[#F3F4F6] select-none">
          
          <div className="flex items-center gap-3 mb-6 bg-white px-3.5 py-1.5 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-500 shrink-0">
            <button className="hover:text-black p-0.5 rounded hover:bg-slate-50 transition-colors">‹</button>
            <span className="font-semibold text-slate-700">Page 1 of 3</span>
            <button className="hover:text-black p-0.5 rounded hover:bg-slate-50 transition-colors">›</button>
          </div>

          <div className="relative bg-white shadow-2xl border border-slate-200 rounded-sm w-[760px] min-h-[1050px] p-20 mb-12 shrink-0 flex flex-col justify-between">
            
            <div className="w-full flex-1 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800 mb-8">Document Page 1</h2>
                <div className="space-y-4">
                  <div className="h-3 bg-slate-200 rounded-md w-1/3 mb-12"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-11/12"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                  <div className="h-2.5 bg-slate-100 rounded-sm w-5/6"></div>
                </div>
              </div>

              <div className="my-16 text-center text-xs font-bold tracking-[0.25em] text-slate-300 uppercase select-none pointer-events-none">
                — Document Preview —
              </div>

              <div className="space-y-4 mb-20">
                <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-5/6"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-full"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-4/5"></div>
                <div className="h-2.5 bg-slate-100 rounded-sm w-2/3"></div>
              </div>
            </div>

            {/* DYNAMIC PLACEMENTS RENDER LAYER */}
            {placements.map((placement) => (
              <Rnd
                key={placement.id}
                size={{ width: placement.width, height: placement.height }}
                position={{ x: placement.x, y: placement.y }}
                bounds="parent" 
                onDragStop={(e, d) => {
                  setPlacements(
                    placements.map((p) => (p.id === placement.id ? { ...p, x: d.x, y: d.y } : p))
                  );
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setPlacements(
                    placements.map((p) =>
                      p.id === placement.id
                        ? {
                            ...p,
                            width: parseInt(ref.style.width),
                            height: parseInt(ref.style.height),
                            ...position,
                          }
                        : p
                    )
                  );
                }}
                className="border border-dashed border-amber-600 bg-amber-50/20 group rounded flex items-center justify-center shadow-sm backdrop-blur-[0.5px]"
              >
                <div className="relative w-full h-full flex items-center justify-center p-2 select-none pointer-events-none">
                  {placement.signatureUrl.startsWith('TEXT:') ? (
                    <span className={`text-center break-all text-slate-800 text-xl ${getFontClass(placement.signatureUrl.split(':')[2])}`}>
                      {placement.signatureUrl.split(':')[1]}
                    </span>
                  ) : (
                    <img 
                      src={placement.signatureUrl} 
                      alt="Signature" 
                      className="w-full h-full object-contain" 
                    />
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePlacement(placement.id);
                  }}
                  className="absolute -top-2 -right-2 hidden group-hover:flex bg-red-500 text-white w-4 h-4 rounded-full text-[9px] items-center justify-center shadow-md pointer-events-auto hover:bg-red-600 transition-colors"
                >
                  ✕
                </button>
              </Rnd>
            ))}

          </div>
        </div>

      </div>

      <SignatureModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(dataUrl) => setSavedSignature(dataUrl)}
      />
    </div>
  );
};