import { useState, useMemo } from 'react';
import SearchBar from '@/src/components/documents/SearchBar';
import DocumentCard from '@/src/components/documents/DocumentCard';
import CountdownTimer from '@/src/components/documents/CountdownTimer';
import Ticker from '@/src/components/common/Ticker';
import { Category } from '@/src/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { useDocuments } from '@/src/hooks/useDocuments';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { documents, loading } = useDocuments();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');

  const filteredDocs = useMemo(() => {
    let docs = [...documents];

    if (category !== 'all') {
      docs = docs.filter(d => d.category === category);
    }

    if (search) {
      const s = search.toLowerCase();
      docs = docs.filter(d => d.title.toLowerCase().includes(s));
    }

    docs.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      return 0;
    });

    return docs;
  }, [documents, search, category, sortBy]);

  const counts = useMemo(() => {
    return {
      all: documents.length,
      provincial: documents.filter(d => d.category === 'provincial').length,
      specialized: documents.filter(d => d.category === 'specialized').length,
      thematic: documents.filter(d => d.category === 'thematic').length,
      prediction: documents.filter(d => d.category === 'prediction').length,
      exam: documents.filter(d => d.category === 'exam').length,
    };
  }, [documents]);

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="bg-navy text-white py-6 md:py-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Kho Tài Liệu <span className="text-amber">Chuyên Đề</span> & Đề Thi Tiếng Anh
              </h1>
              <p className="text-slate-300 text-xs md:text-sm max-w-md mx-auto">
                Tổng hợp đề thi, tài liệu chuyên đề từ các trường chuyên và sở GD&ĐT trên cả nước.
              </p>
            </div>

            <CountdownTimer />
            
            <div className="flex justify-center gap-4">
              <Link to="/thi-online" className="bg-amber text-navy px-6 py-2 rounded-lg font-bold hover:bg-amber/90 transition-colors">
                Thi Online
              </Link>
            </div>
            
            <div className="max-w-xl mx-auto">
              <SearchBar value={search} onChange={setSearch} />
            </div>
          </div>
        </div>
      </section>
      <Ticker />

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
          <Tabs defaultValue="all" className="w-full lg:w-auto" onValueChange={(v) => setCategory(v as any)}>
            <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border-none h-auto flex flex-wrap md:flex-nowrap gap-1">
              <TabsTrigger value="all" className="rounded-xl px-8 py-3.5 text-base font-bold transition-all duration-300 data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 flex items-center gap-3 group">
                Tất cả <span className="text-xs opacity-60 font-bold bg-white/20 px-2 py-0.5 rounded-full">{counts.all}</span>
              </TabsTrigger>
              <TabsTrigger value="provincial" className="rounded-xl px-8 py-3.5 text-base font-bold transition-all duration-300 data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 flex items-center gap-3 group">
                Trường Sở <span className="text-xs opacity-60 font-bold bg-white/20 px-2 py-0.5 rounded-full">{counts.provincial}</span>
              </TabsTrigger>
              <TabsTrigger value="specialized" className="rounded-xl px-8 py-3.5 text-base font-bold transition-all duration-300 data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 flex items-center gap-3 group">
                Trường Chuyên <span className="text-xs opacity-60 font-bold bg-white/20 px-2 py-0.5 rounded-full">{counts.specialized}</span>
              </TabsTrigger>
              <TabsTrigger value="thematic" className="rounded-xl px-8 py-3.5 text-base font-bold transition-all duration-300 data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 flex items-center gap-3 group">
                Chuyên đề <span className="text-xs opacity-60 font-bold bg-white/20 px-2 py-0.5 rounded-full">{counts.thematic}</span>
              </TabsTrigger>
              <TabsTrigger value="prediction" className="rounded-xl px-8 py-3.5 text-base font-bold transition-all duration-300 data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 flex items-center gap-3 group">
                Phát triển & Dự đoán <span className="text-xs opacity-60 font-bold bg-white/20 px-2 py-0.5 rounded-full">{counts.prediction}</span>
              </TabsTrigger>
              <TabsTrigger value="exam" className="rounded-xl px-8 py-3.5 text-base font-bold transition-all duration-300 data-[state=active]:bg-navy data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105 flex items-center gap-3 group">
                Giữa Kì và Học Kì <span className="text-xs opacity-60 font-bold bg-white/20 px-2 py-0.5 rounded-full">{counts.exam}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setSortBy('newest')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${sortBy === 'newest' ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Mới nhất
            </button>
            <button 
              onClick={() => setSortBy('oldest')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${sortBy === 'oldest' ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Cũ nhất
            </button>
            <button 
              onClick={() => setSortBy('az')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${sortBy === 'az' ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Tên A-Z
            </button>
          </div>
        </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredDocs.map((doc: any) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">Không tìm thấy tài liệu nào phù hợp.</p>
        </div>
      )}
      </div>
    </div>
  );
}
