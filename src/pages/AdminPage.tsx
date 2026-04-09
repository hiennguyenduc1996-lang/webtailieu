import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Plus, Trash2, Edit, Loader2, Save, X, ExternalLink, Search, ArrowUpDown, User } from 'lucide-react';
import { auth } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth } from '@/src/hooks/useAuth';
import { useDocuments } from '@/src/hooks/useDocuments';
import { documentService } from '@/src/services/documentService';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Category, Document, RegistrationRequest } from '@/src/types';
import { motion } from 'motion/react';
import { registrationService } from '@/src/services/registrationService';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

const CATEGORY_LABELS: Record<Category, string> = {
  latest: 'Tài liệu mới',
  provincial: 'Đề Trường Sở',
  specialized: 'Đề Trường Chuyên',
  thematic: 'Tài liệu Chuyên đề',
  prediction: 'Đề phát triển và Dự đoán',
  exam: 'Giữa Kì và Học Kì',
  placeholder: 'Mục dự phòng'
};

export default function AdminPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { documents, loading: docsLoading } = useDocuments();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  
  // Search and Sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [regRequests, setRegRequests] = useState<RegistrationRequest[]>([]);
  const [isRegLoading, setIsRegLoading] = useState(false);

  useEffect(() => {
    const isAdmin = profile?.role === 'admin' || user?.email?.toLowerCase() === 'hiennguyenduc1996@gmail.com';
    if (user && isAdmin) {
      fetchRegRequests();
    }
  }, [user, profile]);

  const fetchRegRequests = async () => {
    setIsRegLoading(true);
    try {
      const requests = await registrationService.getRequests();
      setRegRequests(requests);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
    } finally {
      setIsRegLoading(false);
    }
  };

  const handleApproveRequest = async (request: RegistrationRequest) => {
    try {
      // In a real app, we would create the user in Firebase Auth here
      // But for this demo, we'll just update the status
      await registrationService.updateRequestStatus(request.id, 'approved');
      toast.success('Đã chấp nhận yêu cầu');
      fetchRegRequests();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      await registrationService.deleteRequest(id);
      toast.success('Đã xóa yêu cầu đăng ký');
      fetchRegRequests();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDeleteAllRequests = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa TẤT CẢ yêu cầu đăng ký không?')) return;
    
    setIsRegLoading(true);
    try {
      const promises = regRequests.map(req => registrationService.deleteRequest(req.id));
      await Promise.all(promises);
      toast.success('Đã xóa tất cả yêu cầu đăng ký');
      fetchRegRequests();
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xóa');
    } finally {
      setIsRegLoading(false);
    }
  };

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    driveLink: '',
    thumbnailUrl: '',
    category: 'latest' as Category,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Đăng nhập thành công');
    } catch (error: any) {
      toast.error('Sai email hoặc mật khẩu');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success('Đã đăng xuất');
  };

  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractTitle = async () => {
    if (!formData.driveLink) {
      toast.error('Vui lòng nhập link Google Drive');
      return;
    }
    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.driveLink })
      });
      if (response.ok) {
        const data = await response.json();
        setFormData({ ...formData, title: data.title });
        toast.success('Đã lấy tên tài liệu thành công');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Không thể lấy tên tài liệu. Vui lòng kiểm tra lại link.');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi kết nối server');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const driveIdRegex = /(?:id=|\/d\/|folders\/|file\/d\/)([a-zA-Z0-9-_]{25,})/;
      const match = formData.driveLink.match(driveIdRegex);
      const autoThumbnail = match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400` : '';
      
      const finalData = {
        ...formData,
        thumbnailUrl: formData.thumbnailUrl || autoThumbnail
      };

      // Check for duplicate title
      const isDuplicate = documents.some(doc => 
        doc.title.toLowerCase().trim() === finalData.title.toLowerCase().trim() && 
        doc.id !== editingDoc
      );

      if (isDuplicate) {
        toast.error(`Tài liệu "${finalData.title}" đã tồn tại trên hệ thống!`);
        return;
      }

      if (editingDoc) {
        await documentService.updateDocument(editingDoc, finalData);
        toast.success('Cập nhật tài liệu thành công');
      } else {
        await documentService.addDocument(finalData);
        toast.success('Thêm tài liệu thành công');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      try {
        await documentService.deleteDocument(id);
        toast.success('Đã xóa tài liệu');
        setSelectedDocs(prev => prev.filter(item => item !== id));
      } catch (error) {
        toast.error('Không thể xóa tài liệu');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.length === 0) return;
    
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedDocs.length} tài liệu đã chọn?`)) {
      toast.loading(`Đang xóa ${selectedDocs.length} tài liệu...`);
      try {
        await Promise.all(selectedDocs.map(id => documentService.deleteDocument(id)));
        toast.dismiss();
        toast.success(`Đã xóa ${selectedDocs.length} tài liệu`);
        setSelectedDocs([]);
      } catch (error) {
        toast.dismiss();
        toast.error('Có lỗi xảy ra khi xóa hàng loạt');
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocs.length === filteredAndSortedDocs.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredAndSortedDocs.map(doc => doc.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      driveLink: '',
      thumbnailUrl: '',
      category: 'latest',
    });
    setEditingDoc(null);
  };

  const startEdit = (doc: Document) => {
    setFormData({
      title: doc.title,
      author: doc.author || '',
      driveLink: doc.driveLink,
      thumbnailUrl: doc.thumbnailUrl || '',
      category: doc.category,
    });
    setEditingDoc(doc.id);
    setIsDialogOpen(true);
  };

  const filteredAndSortedDocs = React.useMemo(() => {
    let result = documents.filter(doc => 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.author && doc.author.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    result.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'az') return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [documents, searchTerm, sortBy]);

  const prefixStats = React.useMemo(() => {
    const matchPrefix = searchTerm.match(/^([a-zA-Z]+):/i);
    if (!matchPrefix) return null;

    const prefix = matchPrefix[1].toUpperCase();
    const relatedDocs = documents.filter(doc => 
      doc.title.toUpperCase().includes(prefix)
    );

    const numbers: number[] = [];
    relatedDocs.forEach(doc => {
      // Regex thông minh hơn: 
      // 1. Tìm tiền tố (ví dụ VDTS)
      // 2. Bỏ qua phần năm 4 chữ số nếu có dấu ngăn cách phía sau (ví dụ 2026.)
      // 3. Bắt lấy số thứ tự thực sự ở cuối hoặc sau dấu ngăn cách
      const regex = new RegExp(`${prefix}(?:\\s*\\d{4}[^\\d]+)?(\\d+)`, 'i');
      const match = doc.title.match(regex);
      if (match) {
        numbers.push(parseInt(match[1]));
      }
    });

    if (numbers.length === 0) return { prefix, count: relatedDocs.length, missing: [] };

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const missing: number[] = [];

    for (let i = min; i <= max; i++) {
      if (!numbers.includes(i)) {
        missing.push(i);
      }
    }

    return {
      prefix,
      count: relatedDocs.length,
      missing,
      min,
      max
    };
  }, [documents, searchTerm]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-navy p-8 text-center space-y-2">
            <div className="bg-amber w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="text-navy h-6 w-6" />
            </div>
            <CardTitle className="text-2xl text-white">Quản trị viên</CardTitle>
            <p className="text-slate-400 text-sm">Vui lòng đăng nhập để quản lý tài liệu</p>
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-navy uppercase tracking-wider">Email</label>
                <Input 
                  type="email" 
                  placeholder="admin@hoclieuso.vn" 
                  className="h-12 rounded-xl border-slate-200 focus:border-amber focus:ring-amber"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-navy uppercase tracking-wider">Mật khẩu</label>
                <Input 
                  type="password" 
                  className="h-12 rounded-xl border-slate-200 focus:border-amber focus:ring-amber"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-navy hover:bg-slate-800 text-white font-bold transition-all" disabled={isLoginLoading}>
                {isLoginLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Đăng nhập hệ thống
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-navy">Quản lý tài liệu</h1>
          <p className="text-muted-foreground text-sm">Cập nhật và điều chỉnh kho học liệu của bạn</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative flex-grow md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Tìm kiếm tài liệu..." 
              className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setSortBy('newest')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${sortBy === 'newest' ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Mới nhất
            </button>
            <button 
              onClick={() => setSortBy('oldest')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${sortBy === 'oldest' ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Cũ nhất
            </button>
            <button 
              onClick={() => setSortBy('az')}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${sortBy === 'az' ? 'bg-white text-navy shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Tên A-Z
            </button>
          </div>

          {selectedDocs.length > 0 && (
            <Button 
              variant="destructive" 
              className="rounded-xl h-11 px-6 font-bold shadow-lg shadow-red-500/10"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Xóa ({selectedDocs.length})
            </Button>
          )}

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger render={
              <Button className="bg-navy hover:bg-slate-800 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-navy/10">
                <Plus className="mr-2 h-4 w-4" /> Thêm tài liệu
              </Button>
            } />
            <DialogContent className="sm:max-w-[550px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
              <div className="bg-navy p-6 text-white">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="bg-amber p-1.5 rounded-lg">
                    <Plus className="h-4 w-4 text-navy" />
                  </div>
                  {editingDoc ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu mới'}
                </DialogTitle>
                <p className="text-slate-400 text-xs mt-1">Điền đầy đủ thông tin để cập nhật kho tài liệu</p>
              </div>
              <div className="p-6">
                <Tabs defaultValue="single">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl h-11">
                    <TabsTrigger value="single" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Đơn lẻ</TabsTrigger>
                    <TabsTrigger value="bulk" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Hàng loạt</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single">
                    <form onSubmit={handleSubmit} className="space-y-5 py-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-navy uppercase tracking-wider">Tên tài liệu</label>
                          <Input 
                            className="rounded-xl border-slate-200"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-navy uppercase tracking-wider">Tác giả</label>
                          <Input 
                            className="rounded-xl border-slate-200"
                            value={formData.author}
                            onChange={(e) => setFormData({...formData, author: e.target.value})}
                            placeholder="Tên tác giả..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-navy uppercase tracking-wider">Link Google Drive</label>
                        <div className="flex gap-2">
                          <Input 
                            className="rounded-xl border-slate-200"
                            placeholder="https://drive.google.com/..."
                            value={formData.driveLink}
                            onChange={(e) => setFormData({...formData, driveLink: e.target.value})}
                            required
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="rounded-xl border-slate-200 hover:bg-slate-50"
                            onClick={handleExtractTitle}
                            disabled={isExtracting}
                          >
                            {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            <span className="ml-2 hidden sm:inline">Lấy tên</span>
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-navy uppercase tracking-wider">Link ảnh Thumbnail</label>
                        <Input 
                          className="rounded-xl border-slate-200"
                          placeholder="Tự động lấy nếu để trống"
                          value={formData.thumbnailUrl}
                          onChange={(e) => setFormData({...formData, thumbnailUrl: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-navy uppercase tracking-wider">Danh mục</label>
                        <select 
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value as Category})}
                        >
                          <option value="latest">Tài liệu mới</option>
                          <option value="provincial">Đề Trường Sở</option>
                          <option value="specialized">Đề Trường Chuyên</option>
                          <option value="thematic">Tài liệu Chuyên đề</option>
                          <option value="prediction">Đề phát triển và Dự đoán</option>
                          <option value="exam">Giữa Kì và Học Kì</option>
                          <option value="placeholder">Mục dự phòng</option>
                        </select>
                      </div>
                      <Button type="submit" className="w-full h-12 bg-navy hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-navy/10">
                        <Save className="mr-2 h-4 w-4" /> {editingDoc ? 'Cập nhật tài liệu' : 'Lưu tài liệu'}
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="bulk">
                    <div className="space-y-5 py-6">
                      <div className="bg-amber/10 p-4 rounded-xl border border-amber/20">
                        <p className="text-xs text-amber-800 font-medium leading-relaxed">
                          Nhập danh sách link Google Drive (mỗi dòng một link). Hệ thống sẽ tự động nhận diện ID và tạo thumbnail.
                        </p>
                      </div>
                      <textarea 
                        className="w-full h-40 p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:ring-2 focus:ring-amber outline-none transition-all"
                        placeholder="https://drive.google.com/..."
                        id="bulk-input"
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-navy uppercase tracking-wider">Danh mục chung</label>
                        <select 
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm"
                          id="bulk-category"
                        >
                          <option value="latest">Tài liệu mới</option>
                          <option value="provincial">Đề Trường Sở</option>
                          <option value="specialized">Đề Trường Chuyên</option>
                          <option value="thematic">Tài liệu Chuyên đề</option>
                          <option value="prediction">Đề phát triển và Dự đoán</option>
                          <option value="exam">Giữa Kì và Học Kì</option>
                        </select>
                      </div>
                      <Button 
                        className="w-full h-12 bg-navy hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-navy/10"
                        onClick={async () => {
                          const input = (document.getElementById('bulk-input') as HTMLTextAreaElement).value;
                          const category = (document.getElementById('bulk-category') as HTMLSelectElement).value as Category;
                          
                          const driveIdRegex = /(?:id=|\/d\/|folders\/|file\/d\/)([a-zA-Z0-9-_]{25,})/;
                          const lines = input.split('\n').map(l => l.trim()).filter(l => l !== '');
                          
                          if (lines.length === 0) {
                            toast.error('Vui lòng nhập danh sách link');
                            return;
                          }

                          toast.loading('Đang xử lý và lấy tên tài liệu...');
                          let successCount = 0;
                          try {
                            for (const line of lines) {
                              let title = '';
                              let link = line;
                              let currentFileId = '';

                              if (line.includes('|')) {
                                const parts = line.split('|').map(s => s.trim());
                                title = parts[0];
                                link = parts[1];
                                const match = link.match(driveIdRegex);
                                if (match) currentFileId = match[1];
                              } else {
                                const match = line.match(driveIdRegex);
                                const fileId = match ? match[1] : null;
                                if (fileId) currentFileId = fileId;
                                
                                // Try to extract title from API
                                try {
                                  const response = await fetch('/api/extract-title', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ url: line }),
                                    signal: AbortSignal.timeout(15000)
                                  });
                                  if (response.ok) {
                                    const data = await response.json();
                                    title = data.title;
                                  } else {
                                    // If not OK, we'll use the fallback in the catch block
                                    throw new Error('Failed to extract title');
                                  }
                                } catch (e) {
                                  console.warn(`Could not extract title for ${line}, using fallback.`);
                                  if (fileId) {
                                    title = `Tài liệu ${fileId.substring(0, 8)}`;
                                  } else {
                                    title = `Tài liệu mới ${new Date().toLocaleDateString()}`;
                                  }
                                }
                              }

                              // Check for duplicate title in bulk upload
                              const isDuplicate = documents.some(doc => 
                                doc.title.toLowerCase().trim() === title.toLowerCase().trim()
                              );

                              if (isDuplicate) {
                                console.warn(`Skipping duplicate: ${title}`);
                                continue; // Skip this document if title already exists
                              }

                              await documentService.addDocument({
                                title,
                                driveLink: link,
                                category,
                                thumbnailUrl: currentFileId ? `https://drive.google.com/thumbnail?id=${currentFileId}&sz=w400` : '',
                              });
                              successCount++;
                            }
                            toast.dismiss();
                            toast.success(`Đã thêm ${successCount} tài liệu`);
                            setIsDialogOpen(false);
                            (document.getElementById('bulk-input') as HTMLTextAreaElement).value = '';
                          } catch (error) {
                            toast.dismiss();
                            toast.error('Có lỗi xảy ra khi tải lên.');
                          }
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Tải lên hàng loạt
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-bold" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>
      </div>

      {prefixStats && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-amber/10 border border-amber/20 rounded-3xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-amber p-2 rounded-xl">
              <Search className="h-5 w-5 text-navy" />
            </div>
            <div>
              <h3 className="font-bold text-navy">Phân tích mã đề {prefixStats.prefix}</h3>
              <p className="text-xs text-slate-600">Hệ thống đang kiểm tra tính liên tục của các mã đề {prefixStats.prefix}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Tổng số đề {prefixStats.prefix}</p>
              <p className="text-2xl font-black text-navy">{prefixStats.count} <span className="text-sm font-medium text-slate-400">tài liệu</span></p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Dải mã đề</p>
              <p className="text-2xl font-black text-navy">
                {prefixStats.min !== Infinity && prefixStats.min !== undefined ? `${prefixStats.prefix}${prefixStats.min} - ${prefixStats.prefix}${prefixStats.max}` : 'N/A'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">Tình trạng</p>
              {prefixStats.missing.length > 0 ? (
                <p className="text-sm font-bold text-red-500">
                  Thiếu: {prefixStats.missing.map(n => `${prefixStats.prefix}${n}`).join(', ')}
                </p>
              ) : (
                <p className="text-sm font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đầy đủ, liên tục
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <Tabs defaultValue="docs">
            <div className="px-8 py-4 bg-slate-50/50 border-b">
              <TabsList className="bg-slate-200/50 p-1 rounded-xl">
                <TabsTrigger value="docs" className="rounded-lg px-6 font-bold data-[state=active]:bg-white">Tài liệu</TabsTrigger>
                <TabsTrigger value="requests" className="rounded-lg px-6 font-bold data-[state=active]:bg-white">
                  Yêu cầu đăng ký {regRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {regRequests.filter(r => r.status === 'pending').length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="docs" className="m-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-50/50 border-b">
                    <tr>
                      <th className="px-8 py-5 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-amber focus:ring-amber"
                          checked={filteredAndSortedDocs.length > 0 && selectedDocs.length === filteredAndSortedDocs.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-8 py-5">Tên tài liệu & Tác giả</th>
                      <th className="px-8 py-5">Danh mục</th>
                      <th className="px-8 py-5">Ngày tạo</th>
                      <th className="px-8 py-5 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {docsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber" />
                        </td>
                      </tr>
                    ) : filteredAndSortedDocs.length > 0 ? (
                      filteredAndSortedDocs.map((doc) => (
                        <tr key={doc.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedDocs.includes(doc.id) ? 'bg-amber/5' : ''}`}>
                          <td className="px-8 py-5">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-amber focus:ring-amber"
                              checked={selectedDocs.includes(doc.id)}
                              onChange={() => toggleSelectDoc(doc.id)}
                            />
                          </td>
                          <td className="px-8 py-5">
                            <div className="font-bold text-navy group-hover:text-amber transition-colors line-clamp-1">{doc.title}</div>
                            {doc.author && (
                              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                                <span className="w-3 h-[1px] bg-slate-200" />
                                {doc.author}
                              </div>
                            )}
                            <a href={doc.driveLink} target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-navy flex items-center gap-1 mt-2 transition-colors">
                              <ExternalLink className="h-3 w-3" /> drive.google.com/...
                            </a>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                              doc.category === 'specialized' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                              doc.category === 'provincial' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                              {CATEGORY_LABELS[doc.category]}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-slate-500 font-medium">{new Date(doc.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="rounded-lg hover:bg-blue-50 hover:text-blue-600" onClick={() => startEdit(doc)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="rounded-lg hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(doc.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="h-8 w-8 text-slate-200" />
                            <p>Chưa có tài liệu nào phù hợp.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="m-0">
              <div className="p-4 bg-slate-50/50 border-b flex justify-between items-center">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Danh sách yêu cầu ({regRequests.length})
                </div>
                {regRequests.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs rounded-lg"
                    onClick={handleDeleteAllRequests}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Xóa tất cả
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest font-bold bg-slate-50/50 border-b">
                    <tr>
                      <th className="px-8 py-5">Họ và Tên</th>
                      <th className="px-8 py-5">Tên tài khoản</th>
                      <th className="px-8 py-5">Ngày yêu cầu</th>
                      <th className="px-8 py-5">Trạng thái</th>
                      <th className="px-8 py-5 text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isRegLoading ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber" />
                        </td>
                      </tr>
                    ) : regRequests.length > 0 ? (
                      regRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 font-bold text-navy">{req.fullName}</td>
                          <td className="px-8 py-5 text-slate-600">
                            <div>{req.username}</div>
                          </td>
                          <td className="px-8 py-5 text-slate-500">{new Date(req.createdAt).toLocaleDateString('vi-VN')}</td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                              req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {req.status === 'approved' ? 'Đã duyệt' : req.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            {req.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs"
                                  onClick={() => handleApproveRequest(req)}
                                >
                                  Duyệt
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-xs"
                                  onClick={() => handleRejectRequest(req.id)}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground">
                          <p>Chưa có yêu cầu đăng ký nào.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
