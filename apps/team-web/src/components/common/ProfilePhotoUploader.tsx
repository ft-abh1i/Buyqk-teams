import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { db } from '@buyqk/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface Props {
  uid: string;
  initialUrl?: string;
  onUploadSuccess: (url: string) => void;
}

/**
 * Compresses an image to max 120x120px at 0.72 JPEG quality.
 * Result is ~3-5 KB base64 data URL — safe to store directly in Firestore.
 * This bypasses Firebase Storage entirely (no CORS or rules needed).
 */
const compressToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 120;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas ctx')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
};

export const ProfilePhotoUploader: React.FC<Props> = ({ uid, initialUrl, onUploadSuccess }) => {
  const [preview, setPreview] = useState<string>(initialUrl || '');
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }
    setError('');
    setUploading(true);
    setProgress(20);

    try {
      // 1. Compress to tiny ~4KB data URL
      const dataUrl = await compressToDataUrl(file);
      setPreview(dataUrl);
      setProgress(60);

      // 2. Write directly into Firestore (no Firebase Storage needed)
      if (uid && uid !== 'temp') {
        await setDoc(doc(db, 'users', uid), { photoUrl: dataUrl }, { merge: true });
      }
      setProgress(100);
      setUploading(false);
      onUploadSuccess(dataUrl);

    } catch (err: any) {
      console.error('Photo upload error:', err);
      setError('Failed to save photo. Please try again.');
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 font-sans">
      <div className="relative group">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-yellow-500/50 shadow-gold-glow bg-slate-900 flex items-center justify-center relative">
          {preview ? (
            <img src={preview} alt="Profile preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-500">
              <ImageIcon className="w-8 h-8 text-slate-400" />
              <span className="text-[10px] uppercase font-bold">Photo</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-2 p-2">
              <RefreshCw className="w-6 h-6 text-yellow-500 animate-spin" />
              <span className="text-[10px] text-yellow-400 font-bold">{progress}%</span>
              <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <label className="absolute -bottom-2 -right-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 p-2 rounded-xl shadow-lg cursor-pointer transition-transform hover:scale-110 border border-yellow-300">
          <Upload className="w-4 h-4" />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      <p className="text-[11px] text-slate-400 font-medium text-center">
        JPG or PNG — tap ↑ to upload. Auto-compressed.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {preview && !uploading && progress === 100 && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5" /> Photo Saved ✓
        </div>
      )}
    </div>
  );
};
