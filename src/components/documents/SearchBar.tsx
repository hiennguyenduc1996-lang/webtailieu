import { Search, FileText, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useRef } from 'react';
import { Document } from '@/src/types';
import { documentService } from '@/src/services/documentService';
import { motion, AnimatePresence } from 'motion/react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [results, setResults] = useState<Document[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      const docs = await documentService.getDocuments();
      setAllDocs(docs);
    };
    fetchDocs();
  }, []);

  useEffect(() => {
    if (value.trim().length > 1) {
      const filtered = allDocs.filter(doc => 
        doc.title.toLowerCase().includes(value.toLowerCase()) ||
        (doc.author && doc.author.toLowerCase().includes(value.toLowerCase()))
      ).slice(0, 5);
      setResults(filtered);
      setShowDropdown(true);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [value, allDocs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={dropdownRef}>
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-navy group-focus-within:text-amber transition-colors z-10" />
        <Input
          type="text"
          placeholder="Nhập tên chuyên đề, tên trường... (ví dụ: Chuyên Lê Hồng Phong)"
          className="pl-12 h-14 text-base rounded-2xl border-none bg-white shadow-xl focus-visible:ring-2 focus-visible:ring-amber text-navy placeholder:text-slate-400"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.trim().length > 1 && setShowDropdown(true)}
        />
      </div>

      <AnimatePresence>
        {showDropdown && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
          >
            <div className="p-2">
              {results.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    window.open(doc.driveLink, '_blank');
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left group"
                >
                  <div className="bg-red-50 p-2 rounded-lg group-hover:bg-red-100 transition-colors">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold text-navy truncate">{doc.title}</p>
                    {doc.author && <p className="text-xs text-muted-foreground truncate">{doc.author}</p>}
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-navy transition-colors" />
                </button>
              ))}
            </div>
            <div className="bg-slate-50 p-3 text-center border-t">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Nhấn Enter để xem tất cả kết quả
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
