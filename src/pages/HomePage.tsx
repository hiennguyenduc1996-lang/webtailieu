import { useState, useMemo } from 'react';
import SearchBar from '@/src/components/documents/SearchBar';
import DocumentCard from '@/src/components/documents/DocumentCard';
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

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <section className="bg-navy text-white py-10 md:py-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Kho Tài Liệu <span className="text-amber">Chuyên Đề</span> & Đề Thi Đỉnh Cao
              </h1>
              <p className="text-slate-300 text-sm md:text-base max-w-md mx-auto">
                Tổng hợp đề thi, tài liệu chuyên đề từ các trường chuyên và sở GD&ĐT trên cả nước.
              </p>
            </div>
            
            <div className="max-w-xl mx-auto">
              <SearchBar value={search} onChange={setSearch} />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <Tabs defaultValue="all" className="w-full lg:w-auto" onValueChange={(v) => setCategory(v as any)}>
            <TabsList className="bg-white p-1 rounded-xl shadow-sm border h-auto flex flex-wrap md:flex-nowrap">
              <TabsTrigger value="all" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-navy data-[state=active]:text-white">Tất cả</TabsTrigger>
              <TabsTrigger value="provincial" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-navy data-[state=active]:text-white">Trường Sở</TabsTrigger>
              <TabsTrigger value="specialized" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-navy data-[state=active]:text-white">Trường Chuyên</TabsTrigger>
              <TabsTrigger value="thematic" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-navy data-[state=active]:text-white">Chuyên đề</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center p-1 bg-white rounded-xl shadow-sm border">
            <button 
              onClick={() => setSortBy('newest')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'newest' ? 'bg-navy text-white' : 'text-muted-foreground hover:bg-slate-50'}`}
            >
              Mới nhất
            </button>
            <button 
              onClick={() => setSortBy('oldest')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'oldest' ? 'bg-navy text-white' : 'text-muted-foreground hover:bg-slate-50'}`}
            >
              Cũ nhất
            </button>
            <button 
              onClick={() => setSortBy('az')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === 'az' ? 'bg-navy text-white' : 'text-muted-foreground hover:bg-slate-50'}`}
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
