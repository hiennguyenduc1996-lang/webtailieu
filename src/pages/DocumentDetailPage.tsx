import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDocuments } from '@/src/hooks/useDocuments';
import { useAuth } from '@/src/hooks/useAuth';
import { commentService } from '@/src/services/commentService';
import { Document, Comment } from '@/src/types';
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
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, loading: docsLoading } = useDocuments();
  const { user, profile } = useAuth();
  const [doc, setDoc] = useState<Document | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!docsLoading && documents.length > 0) {
      const found = documents.find(d => d.id === id);
      if (found) {
        setDoc(found);
      } else {
        toast.error('Không tìm thấy tài liệu');
        navigate('/');
      }
    }
  }, [id, documents, docsLoading, navigate]);

  useEffect(() => {
    if (id) {
      const unsubscribe = commentService.subscribeToComments(id, (data) => {
        setComments(data);
      });
      return () => unsubscribe();
    }
  }, [id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || profile?.status !== 'approved') {
      toast.error('Bạn cần có tài khoản đã được duyệt để bình luận');
      return;
    }
    if (!newComment.trim() && !imageUrl.trim()) return;

    setIsSubmitting(true);
    try {
      await commentService.addComment({
        documentId: id!,
        userId: user.uid,
        userName: profile.fullName || user.email?.split('@')[0] || 'Người dùng',
        content: newComment,
        imageUrl: imageUrl || undefined,
        createdAt: Date.now()
      });
      setNewComment('');
      setImageUrl('');
      toast.success('Đã gửi bình luận');
    } catch (error) {
      toast.error('Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmbedLink = (link: string) => {
    if (link.includes('drive.google.com')) {
      return link.replace(/\/view\?usp=sharing|\/view/, '/preview');
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
        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-black text-navy leading-tight">{doc.title}</h1>
          {doc.author && (
            <p className="text-slate-500 font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> {doc.author}
            </p>
          )}
        </div>

        {/* Document Viewer */}
        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-slate-900 aspect-[3/4] md:aspect-video relative group">
          <iframe 
            src={getEmbedLink(doc.driveLink)} 
            className="w-full h-full border-none"
            allow="autoplay"
          />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={doc.driveLink} target="_blank" rel="noreferrer">
              <Button size="sm" className="bg-white/90 hover:bg-white text-navy font-bold rounded-xl shadow-lg">
                <ExternalLink className="h-4 w-4 mr-2" /> Mở trong Drive
              </Button>
            </a>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="flex justify-center">
          <a href={doc.driveLink} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
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
          {user ? (
            profile?.status === 'approved' ? (
              <form onSubmit={handleAddComment} className="space-y-4 bg-white p-6 rounded-3xl shadow-lg border border-slate-50">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-grow space-y-4">
                    <textarea 
                      placeholder="Viết bình luận hoặc góp ý của bạn..."
                      className="w-full min-h-[100px] p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-amber outline-none transition-all text-sm"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                      <div className="relative w-full sm:max-w-xs">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="Dán link ảnh đáp án..."
                          className="pl-10 h-10 rounded-xl border-slate-100 bg-slate-50 text-xs"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full sm:w-auto bg-navy hover:bg-slate-800 text-white font-bold rounded-xl px-8"
                        disabled={isSubmitting || (!newComment.trim() && !imageUrl.trim())}
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Gửi bình luận
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-amber/5 border border-amber/10 p-6 rounded-3xl text-center space-y-3">
                <Lock className="h-8 w-8 text-amber mx-auto" />
                <p className="text-sm font-bold text-navy">Tài khoản của bạn đang chờ phê duyệt</p>
                <p className="text-xs text-slate-500">Bạn cần được Admin phê duyệt để có thể tham gia bình luận.</p>
              </div>
            )
          ) : (
            <div className="bg-slate-50 p-8 rounded-3xl text-center space-y-4 border-2 border-dashed border-slate-200">
              <p className="text-slate-500 font-medium">Vui lòng đăng ký và đăng nhập để tham gia thảo luận.</p>
              <div className="flex justify-center gap-3">
                <Link to="/register">
                  <Button variant="outline" className="rounded-xl font-bold">Đăng ký</Button>
                </Link>
                <Link to="/admin">
                  <Button className="bg-navy text-white rounded-xl font-bold">Đăng nhập</Button>
                </Link>
              </div>
            </div>
          )}

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
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy text-sm">{comment.userName}</span>
                      <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString('vi-VN')}</span>
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
      </div>
    </div>
  );
}
