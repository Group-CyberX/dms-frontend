"use client"

import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import Cropper from 'react-easy-crop';
import { Great_Vibes, Playfair_Display, Inter } from 'next/font/google';

const cursiveFont = Great_Vibes({ weight: '400', subsets: ['latin'] });
const serifFont = Playfair_Display({ weight: '600', subsets: ['latin'] });
const sansFont = Inter({ weight: '500', subsets: ['latin'] });

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [typedName, setTypedName] = useState('John Doe');
  const [selectedFont, setSelectedFont] = useState<'cursive' | 'serif' | 'sans'>('cursive');

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  if (!isOpen) return null;

  // Converts Typed Name text to a clean image using HTML Canvas
  const generateTypedSignatureImage = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set size matching typical bounding aspects
    canvas.width = 450;
    canvas.height = 180;
    
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Match the native font definitions
      let fontStyle = '32px sans-serif';
      if (selectedFont === 'cursive') fontStyle = '44px "Great Vibes", cursive';
      else if (selectedFont === 'serif') fontStyle = 'bold 36px "Playfair Display", serif';
      else if (selectedFont === 'sans') fontStyle = '500 30px "Inter", sans-serif';
      
      ctx.font = fontStyle;
      ctx.fillStyle = '#1e293b'; // slate-800
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Paint text to the center of the viewport
      ctx.fillText(typedName || 'Preview', canvas.width / 2, canvas.height / 2);
    }
    
    return canvas.toDataURL('image/png');
  };

  const getCroppedImgUrl = (imageSrcStr: string, pixelCrop: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrcStr;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("No 2d context"));
          return;
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = (err) => reject(err);
    });
  };

  const handleSave = async () => {
    if (activeTab === 'draw' && sigCanvasRef.current) {
      if (!sigCanvasRef.current.isEmpty()) {
        onSave(sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png'));
      }
    } else if (activeTab === 'type') {
      // Turn typed text directly into a responsive, draggable image snapshot!
      const generatedImg = generateTypedSignatureImage();
      onSave(generatedImg);
    } else if (activeTab === 'upload' && imageSrc && croppedAreaPixels) {
      try {
        const croppedDataUrl = await getCroppedImgUrl(imageSrc, croppedAreaPixels);
        onSave(croppedDataUrl);
      } catch (error) {
        console.error("Error cropping signature image:", error);
        onSave(imageSrc); 
      }
    }
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div 
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Create Signature</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="my-3 text-xs font-medium text-slate-400 leading-relaxed">
          Draw, type, or upload a signature. It will be saved to your account and reusable on future documents.
        </p>

        <div className="my-4 flex rounded-lg bg-slate-100 p-1">
          {(['draw', 'type', 'upload'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="w-full h-64 rounded-xl border border-slate-200 bg-slate-50/50 relative overflow-hidden flex flex-col">
          
          {activeTab === 'draw' && (
            <div className="w-full h-full bg-transparent relative">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{ 
                  className: 'w-full h-full cursor-crosshair' 
                }}
                dotSize={1.5}
                penColor="#000000"
              />
            </div>
          )}

          {activeTab === 'type' && (
            <div className="w-full h-full p-6 space-y-4 flex flex-col justify-center">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Your Name</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="rounded-lg border border-slate-200 p-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8B2E00]/10 focus:border-[#8B2E00] bg-white transition"
                />
              </div>
              <div className="flex gap-2">
                {(['cursive', 'serif', 'sans'] as const).map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => setSelectedFont(font)}
                    className={`rounded-md px-4 py-1 text-xs font-bold capitalize border transition-all ${
                      selectedFont === font ? 'bg-[#8B2E00] text-white border-[#8B2E00] shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
              <div className="mt-1 text-center p-3 border border-slate-100 rounded-xl bg-white min-h-[70px] flex items-center justify-center shadow-inner">
                <span 
                  className={`text-slate-800 text-3xl select-none tracking-normal ${
                    selectedFont === 'cursive' 
                      ? cursiveFont.className 
                      : selectedFont === 'serif' 
                      ? serifFont.className 
                      : sansFont.className
                  }`}
                >
                  {typedName || 'Preview'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="w-full h-full flex flex-col relative">
              {!imageSrc ? (
                <label className="flex flex-col items-center cursor-pointer p-6 w-full h-full justify-center transition hover:bg-slate-100/50 bg-slate-50">
                  <span className="text-3xl text-slate-400 mb-2">📤</span>
                  <span className="text-xs font-bold text-slate-600">Click to upload signature image</span>
                  <span className="text-[10px] text-slate-400 mt-1">PNG or JPG with transparent background works best</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              ) : (
                <div className="w-full h-full flex flex-col relative bg-slate-900">
                  <div 
                    style={{ height: '190px', position: 'relative' }} 
                    className="w-full bg-slate-900 overflow-hidden shrink-0"
                  >
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={3 / 1} 
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                    />
                  </div>

                  <div className="h-12 w-full bg-white border-t border-slate-100 px-4 flex items-center gap-3 z-30 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zoom</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-label="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#8B2E00]"
                    />
                    <button
                      type="button"
                      onClick={() => setImageSrc(null)}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            {activeTab === 'draw' ? (
              <button 
                type="button"
                onClick={() => sigCanvasRef.current?.clear()} 
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition"
              >
                Clear
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose} 
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm bg-white"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSave} 
              className="rounded-lg bg-[#8B2E00] hover:bg-[#722600] px-4 py-2 text-xs font-bold text-white shadow-md transition-all tracking-wide"
            >
              Save Signature
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};