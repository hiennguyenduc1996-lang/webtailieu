import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDocuments } from '@/src/hooks/useDocuments';
import { useAuth } from '@/src/hooks/useAuth';
import { commentService } from '@/src/services/commentService';
import { Document, Comment } from '@/src/types';
import DocumentCard from '@/src/components/documents/DocumentCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Download, 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Loader2, 
  User,
  ExternalLink,
  Lock,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const RANDOM_NAMES = [
  'Học sinh chăm chỉ', 'Người lạ ẩn danh', 'Thành viên mới', 'Bạn đọc nhiệt tình',
  'Người yêu tiếng Anh', 'Sĩ tử 2k6', 'Sĩ tử 2k7', 'Thầy giáo vui tính',
  'Cô giáo thân thiện', 'Bạn nhỏ hiếu học', 'Người qua đường', 'Fan cứng NK12'
];

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, loading: docsLoading } = useDocuments();
  const { user } = useAuth();
  const [doc, setDoc] = useState<Document | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('comment_user_name');
    if (saved) return saved;
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    return random;
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isAdmin = useMemo(() => {
    return user?.email?.toLowerCase() === 'hiennguyenduc1996@gmail.com';
  }, [user]);

  useEffect(() => {
    const downloaded = JSON.parse(localStorage.getItem('downloaded_docs') || '[]');
    if (id && downloaded.includes(id)) {
      setIsDownloaded(true);
    }
  }, [id]);

  useEffect(() => {
    localStorage.setItem('comment_user_name', userName);
  }, [userName]);

  const relatedDocs = useMemo(() => {
    if (!doc || !documents.length) return [];
    return documents
      .filter(d => d.category === doc.category && d.id !== doc.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [doc, documents]);

  const markAsDownloaded = (docId: string) => {
    const downloaded = JSON.parse(localStorage.getItem('downloaded_docs') || '[]');
    if (!downloaded.includes(docId)) {
      downloaded.push(docId);
      localStorage.setItem('downloaded_docs', JSON.stringify(downloaded));
      setIsDownloaded(true);
    }
  };

  useEffect(() => {
    if (!docsLoading && documents.length > 0) {
      const found = documents.find(d => d.id === id);
      if (found) {
        setDoc(found);
        // Mark as "viewed/downloaded" when user clicks thumbnail and enters this page
        markAsDownloaded(found.id);
      } else {
        toast.error('Không tìm thấy tài liệu');
        navigate('/');
      }
    }
  }, [id, documents, docsLoading, navigate]);

  const handleDownloadClick = () => {
    if (doc) {
      markAsDownloaded(doc.id);
    }
  };

  useEffect(() => {
    if (id) {
      const unsubscribe = commentService.subscribeToComments(id, (data) => {
        setComments(data);
      });
      return () => unsubscribe();
    }
  }, [id]);

  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh');
      return;
    }

    if (file.size > 800 * 1024) { // 800KB limit
      toast.error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 800KB');
      return;
    }

    setIsProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageUrl(result);
      setIsProcessingImage(false);
    };
    reader.onerror = () => {
      toast.error('Lỗi khi xử lý ảnh');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImage(file);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && !imageUrl.trim()) return;
    if (!userName.trim()) {
      toast.error('Vui lòng nhập tên của bạn');
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedComment = newComment.trim();
      const trimmedImageUrl = imageUrl.trim();

      const commentData: any = {
        documentId: id!,
        userId: user?.uid || 'anonymous',
        userName: userName.trim(),
        content: trimmedComment,
        createdAt: Date.now()
      };

      if (trimmedImageUrl) {
        commentData.imageUrl = trimmedImageUrl;
      }

      await commentService.addComment(commentData);
      setNewComment('');
      setImageUrl('');
      toast.success('Đã gửi bình luận');
    } catch (error) {
      console.error('Comment submission error:', error);
      toast.error('Không thể gửi bình luận. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      toast.success('Đã xóa bình luận');
    } catch (error) {
      toast.error('Không thể xóa bình luận');
    }
  };

  const getEmbedLink = (link: string) => {
    const driveIdRegex = /(?:id=|\/d\/|folders\/|file\/d\/)([a-zA-Z0-9-_]{25,})/;
    const match = link.match(driveIdRegex);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return link;
  };

  const getDownloadLink = (link: string) => {
    const driveIdRegex = /(?:id=|\/d\/|folders\/|file\/d\/)([a-zA-Z0-9-_]{25,})/;
    const match = link.match(driveIdRegex);
    if (match && match[1]) {
      return `https://drive.google.com/uc?id=${match[1]}&export=download`;
    }
    return link;
  };

  if (docsLoading || !doc) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="h-12 w-12 animate-spin text-amber" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-navy font-bold transition-colors group mb-6">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại Trang chủ
      </Link>

      <div className="space-y-8">
        {/* Header Info */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-4xl font-black text-navy leading-tight">{doc.title}</h1>
            {isDownloaded && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-2 animate-in fade-in zoom-in duration-500">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Đã tải
              </span>
            )}
          </div>
          {doc.author && (
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> {doc.author}
            </p>
          )}
        </div>

        {/* Document Viewer */}
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-slate-900 aspect-[3/4] md:aspect-[4/5.5] relative group">
          <iframe 
            src={getEmbedLink(doc.driveLink)} 
            className="w-full h-full border-none"
            allow="autoplay"
          />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={doc.driveLink} target="_blank" rel="noreferrer" onClick={handleDownloadClick}>
              <Button size="sm" className="bg-white/90 hover:bg-white text-navy font-bold rounded-xl shadow-lg">
                <ExternalLink className="h-4 w-4 mr-2" /> Mở trong Drive
              </Button>
            </a>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="flex justify-center">
          <a href={getDownloadLink(doc.driveLink)} target="_blank" rel="noreferrer" className="w-full sm:w-auto" onClick={handleDownloadClick}>
            <Button className="w-full sm:w-auto h-14 px-12 bg-amber hover:bg-amber/90 text-navy font-black text-lg rounded-2xl shadow-xl shadow-amber/20 gap-3 transition-all hover:scale-105 active:scale-95">
              <Download className="h-6 w-6" /> Tải đề thi ngay
            </Button>
          </a>
        </div>

        {/* Comment Section */}
        <div className="pt-12 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="bg-navy p-2 rounded-xl">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-navy">Thảo luận & Góp ý</h2>
            <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-lg font-bold">{comments.length}</span>
          </div>

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="space-y-4 bg-white p-6 rounded-3xl shadow-lg border border-slate-50">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="w-8 h-8 rounded-full bg-amber/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-amber" />
                </div>
                <Input 
                  placeholder="Tên của bạn..."
                  className="h-9 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold text-navy w-full sm:w-48"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Bạn có thể thay đổi tên hiển thị của mình.</p>
            </div>

            <div className="flex gap-4">
              <div className="flex-grow space-y-4">
                <textarea 
                  placeholder="Viết bình luận hoặc góp ý của bạn... (Có thể dán ảnh trực tiếp vào đây)"
                  className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-amber outline-none transition-all text-sm"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onPaste={handlePaste}
                />
                
                <AnimatePresence>
                  {imageUrl && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative inline-block"
                    >
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="max-h-40 rounded-xl border border-slate-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-slate-200 text-slate-500 hover:text-navy hover:border-navy gap-2 h-10"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage}
                    >
                      {isProcessingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Tải ảnh lên
                    </Button>
                    <div className="relative flex-grow sm:w-48">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Hoặc dán link ảnh..."
                        className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50 text-[10px]"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto bg-navy hover:bg-slate-800 text-white font-bold rounded-xl px-8 h-10"
                    disabled={isSubmitting || (!newComment.trim() && !imageUrl.trim())}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Gửi bình luận
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            <AnimatePresence>
              {comments.map((comment) => (
                <motion.div 
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4 group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-grow space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy text-sm">{comment.userName}</span>
                        <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                      {comment.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-slate-100">
                          <img 
                            src={comment.imageUrl} 
                            alt="Attached" 
                            className="max-w-full h-auto"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {comments.length === 0 && (
              <div className="text-center py-12 text-slate-300">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              </div>
            )}
          </div>
        </div>

        {/* Related Documents */}
        {relatedDocs.length > 0 && (
          <div className="pt-16 space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="bg-amber p-2 rounded-xl">
                <ExternalLink className="h-5 w-5 text-navy" />
              </div>
              <h2 className="text-xl font-bold text-navy">Tài liệu cùng thể loại mới nhất</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {relatedDocs.map((rd) => (
                <DocumentCard key={rd.id} doc={rd} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
