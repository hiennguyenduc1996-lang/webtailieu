import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Loader2, User, ArrowLeft } from 'lucide-react';
import { auth } from '@/src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/src/hooks/useAuth';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { db } from '@/src/lib/firebase';
import { doc as firestoreDoc, getDoc, setDoc } from 'firebase/firestore';
import { registrationService } from '@/src/services/registrationService';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    
    const loginIdentifier = email.trim().toLowerCase();
    const loginPassword = password.trim();

    // 1. Kiểm tra nếu là Admin (đăng nhập bằng email thật)
    if (loginIdentifier === 'hiennguyenduc1996@gmail.com') {
      try {
        await signInWithEmailAndPassword(auth, loginIdentifier, loginPassword);
        toast.success('Đăng nhập Admin thành công');
        return;
      } catch (error: any) {
        console.error('Admin login error:', error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          toast.error('Sai mật khẩu Admin');
        } else if (error.code === 'auth/user-not-found') {
          toast.error('Tài khoản Admin không tồn tại');
        } else {
          toast.error('Lỗi đăng nhập Admin: ' + error.message);
        }
        setIsLoginLoading(false);
        return;
      }
    }

    // 2. Đăng nhập cho người dùng thông thường (Simple Auth)
    try {
      // Tìm yêu cầu đăng ký theo username (không phân biệt hoa thường)
      const request = await registrationService.findRequest(loginIdentifier);
      
      if (!request) {
        toast.error('Tên đăng nhập không tồn tại');
        setIsLoginLoading(false);
        return;
      }

      if (request.status !== 'approved') {
        toast.error('Tài khoản của bạn đang chờ phê duyệt hoặc đã bị từ chối');
        setIsLoginLoading(false);
        return;
      }

      if (request.password !== loginPassword) {
        toast.error('Mật khẩu không chính xác');
        setIsLoginLoading(false);
        return;
      }

      // Đăng nhập thành công (Mock)
      localStorage.setItem('hoclieuso_session', JSON.stringify({
        id: request.id,
        username: request.username,
        fullName: request.fullName
      }));
      
      toast.success('Đăng nhập thành công');
      window.location.reload(); // Reload to update Auth state
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('permission')) {
        toast.error('Lỗi quyền truy cập hệ thống. Vui lòng liên hệ Admin.');
      } else {
        toast.error('Có lỗi xảy ra khi đăng nhập: ' + (error.code || error.message));
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="h-12 w-12 animate-spin text-amber" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-navy font-bold transition-colors group mb-8">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Quay lại Trang chủ
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl overflow-hidden">
        <div className="bg-navy p-8 text-center space-y-2">
          <div className="bg-amber w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="text-navy h-6 w-6" />
          </div>
          <CardTitle className="text-2xl text-white">Đăng nhập</CardTitle>
          <p className="text-slate-400 text-sm">Đăng nhập vào hệ thống quản lí tài liệu</p>
        </div>
        <CardContent className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-navy uppercase tracking-wider">Tên đăng nhập</label>
              <Input 
                type="text" 
                placeholder="Ví dụ: luuquocanh" 
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
              Đăng nhập ngay
            </Button>
          </form>
          
        </CardContent>
      </Card>
    </div>
  );
}
