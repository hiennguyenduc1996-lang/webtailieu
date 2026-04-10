import { useState, useMemo } from 'react';
import DocumentCard from '@/src/components/documents/DocumentCard';
import { useDocuments } from '@/src/hooks/useDocuments';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LatestDocumentsPage() {
  const { documents, loading } = useDocuments();
  const [filter, setFilter] = useState<'1' | '3' | '7' | '30'>('7');

  const filteredDocs = useMemo(() => {
    const now = new Date().getTime();
    const daysInMs = parseInt(filter) * 24 * 60 * 60 * 1000;
    
    return documents.filter(doc => (now - new Date(doc.createdAt).getTime()) <= daysInMs)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [documents, filter]);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-navy mb-8">Tài liệu mới</h1>
      
      <Tabs defaultValue="7" className="mb-8" onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border-none h-auto flex flex-wrap gap-1">
          <TabsTrigger value="1" className="rounded-xl px-6 py-2 text-sm font-bold transition-all data-[state=active]:bg-navy data-[state=active]:text-white">1 ngày</TabsTrigger>
          <TabsTrigger value="3" className="rounded-xl px-6 py-2 text-sm font-bold transition-all data-[state=active]:bg-navy data-[state=active]:text-white">3 ngày</TabsTrigger>
          <TabsTrigger value="7" className="rounded-xl px-6 py-2 text-sm font-bold transition-all data-[state=active]:bg-navy data-[state=active]:text-white">7 ngày</TabsTrigger>
          <TabsTrigger value="30" className="rounded-xl px-6 py-2 text-sm font-bold transition-all data-[state=active]:bg-navy data-[state=active]:text-white">1 tháng</TabsTrigger>
        </TabsList>
      </Tabs>

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
          <p className="text-muted-foreground text-lg">Không có tài liệu mới trong khoảng thời gian này.</p>
        </div>
      )}
    </div>
  );
}
