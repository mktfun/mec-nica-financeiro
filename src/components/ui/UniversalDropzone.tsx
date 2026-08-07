import React, { useCallback, useState } from 'react';
import { Upload, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type FileTypeCategory = 'OFX' | 'MAQUININHA' | 'JUROS' | 'UNKNOWN';

export interface ClassifiedFile {
  file: File;
  category: FileTypeCategory;
}

export function classifyFile(file: File): FileTypeCategory {
  const name = file.name.toUpperCase();
  if (name.endsWith('.OFX')) return 'OFX';
  if (name.endsWith('.XLSX') || name.endsWith('.XLS')) {
    if (name.includes('JURO') || name.includes('TAXA') || name.includes('CUSTO')) return 'JUROS';
    return 'MAQUININHA'; // Default xlsx assumption
  }
  return 'UNKNOWN';
}

interface UniversalDropzoneProps {
  onFilesAccepted: (files: ClassifiedFile[]) => void;
  isProcessing?: boolean;
}

export function UniversalDropzone({ onFilesAccepted, isProcessing }: UniversalDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [onFilesAccepted]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  }, [onFilesAccepted]);

  const handleFiles = (files: File[]) => {
    const classified = files.map(file => ({
      file,
      category: classifyFile(file)
    }));
    onFilesAccepted(classified);
  };

  return (
    <div 
      className={`relative rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 border-2 border-dashed ${
        isDragActive 
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_0_40px_-10px_var(--color-primary)]' 
          : 'border-[var(--border-strong)] bg-[var(--bg-surface)]/50 hover:border-[var(--color-primary)]/50 hover:bg-[var(--bg-surface-elevated)]'
      }`}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input 
        type="file" 
        multiple 
        accept=".ofx,.xlsx,.xls" 
        id="universal-upload" 
        hidden 
        onChange={onFileInput}
        disabled={isProcessing}
      />
      <label 
        htmlFor="universal-upload" 
        className={`cursor-pointer flex flex-col items-center w-full h-full ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <motion.div 
          animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          className="w-20 h-20 bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-accent-teal)] rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-[var(--color-primary)]/30"
        >
          <Upload size={36} className="text-white" />
        </motion.div>
        
        <h3 className="text-2xl font-display font-bold text-[var(--text-primary)] mb-2 tracking-tight">Central de Importação Massiva</h3>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md">
          Arraste e solte arquivos <strong>.OFX</strong>, <strong>Maquininha (.XLSX)</strong> ou <strong>Juros Rede (.XLSX)</strong>. O sistema classificará e processará todos automaticamente.
        </p>

        <div className="flex gap-4 items-center justify-center flex-wrap">
          <div className="flex items-center gap-2 bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-teal)]"></div> Extratos OFX
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-warning)]"></div> Maquininhas (XLSX)
          </div>
          <div className="flex items-center gap-2 bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-danger)]"></div> Custos e Juros (XLSX)
          </div>
        </div>
      </label>
    </div>
  );
}
