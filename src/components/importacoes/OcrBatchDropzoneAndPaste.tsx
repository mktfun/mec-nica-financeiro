import React, { useEffect, useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Clipboard, X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QueuedImage {
  id: string;
  name: string;
  base64: string;
  previewUrl: string;
  sizeBytes: number;
}

interface OcrBatchDropzoneAndPasteProps {
  onStartProcessing: (images: Array<{ id: string; base64: string; name: string }>) => void;
  isProcessing: boolean;
  selectedStoreName?: string;
}

export const OcrBatchDropzoneAndPaste: React.FC<OcrBatchDropzoneAndPasteProps> = ({
  onStartProcessing,
  isProcessing,
  selectedStoreName,
}) => {
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAddFiles = async (files: File[]) => {
    const validImages = files.filter(f => f.type.startsWith('image/'));
    if (validImages.length === 0) return;

    const newItems: QueuedImage[] = [];
    for (const file of validImages) {
      try {
        const base64 = await fileToBase64(file);
        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name || `Print OS #${queuedImages.length + newItems.length + 1}`,
          base64,
          previewUrl: base64,
          sizeBytes: file.size,
        });
      } catch (err) {
        console.error('Error reading image file:', err);
      }
    }

    setQueuedImages(prev => [...prev, ...newItems]);
    showToast(`${newItems.length} imagem(ns) adicionada(s)!`);
  };

  const showToast = (msg: string) => {
    setPasteToast(msg);
    setTimeout(() => setPasteToast(null), 3000);
  };

  // Clipboard Paste Listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        await handleAddFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isProcessing, queuedImages.length]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    await handleAddFiles(files);
  };

  const handleRemoveImage = (id: string) => {
    setQueuedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleClearAll = () => {
    setQueuedImages([]);
  };

  const handleTriggerProcess = () => {
    if (queuedImages.length === 0) return;
    onStartProcessing(
      queuedImages.map(img => ({
        id: img.id,
        base64: img.base64,
        name: img.name,
      }))
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-emerald-400" />
            Captura de Prints & Screenshots do Oficina Inteligente
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Abra a OS na tela do ERP (aba <strong className="text-zinc-200">Pagamentos</strong>), tire print e dê <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">Ctrl + V</kbd>
          </p>
        </div>
        {selectedStoreName && (
          <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-700/60 text-zinc-300">
            Filtro Ativo: <strong className="text-indigo-400">{selectedStoreName}</strong>
          </span>
        )}
      </div>

      {/* Dropzone Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex-1 min-h-[180px] rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6 text-center ${
          isDragOver
            ? 'border-emerald-500/80 bg-emerald-950/20'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleAddFiles(Array.from(e.target.files));
            }
          }}
        />

        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center mb-3 shadow-inner">
          <UploadCloud className="w-6 h-6 text-indigo-400 animate-pulse" />
        </div>

        <p className="text-sm font-medium text-zinc-200 mb-1">
          Arraste prints de OSs aqui ou clique para selecionar
        </p>
        <p className="text-xs text-zinc-400 max-w-md">
          Você também pode dar <span className="text-emerald-400 font-semibold">Ctrl + V</span> direto em qualquer lugar da tela. Suporta múltiplos prints de uma vez.
        </p>

        {pasteToast && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-top-1">
            <Check className="w-3.5 h-3.5" />
            {pasteToast}
          </div>
        )}
      </div>

      {/* Queued Thumbnails Grid */}
      {queuedImages.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
              {queuedImages.length} print(s) na fila para processar:
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isProcessing}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Limpar fila
            </button>
          </div>

          <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            {queuedImages.map((img) => (
              <div
                key={img.id}
                className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 aspect-video flex items-center justify-center"
              >
                <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                  <span className="text-[10px] text-zinc-200 truncate w-full text-center">{img.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(img.id);
                    }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-500 text-white hover:bg-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              onClick={handleTriggerProcess}
              disabled={isProcessing || queuedImages.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <Sparkles className="w-4 h-4 text-emerald-200 animate-spin" />
              Processar {queuedImages.length} Print(s) com Mistral AI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
