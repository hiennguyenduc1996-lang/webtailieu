import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserPlus, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { registrationService } from '@/src/services/registrationService';
import { motion } from 'motion/react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp');
      return;
    }

    setIsLoading(true);
    try {
      await registrationService.createRequest({
        fullName: formData.fullName,
        username: formData.username,
      });
      setIsSubmitted(true);
      toast.success('Gửi yêu cầu đăng ký thành công');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi gửi yêu cầu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden text-center">
            <div className="bg-emerald-500 p-12 flex justify-center">
              <div className="bg-white/20 p-4 rounded-full">
                <CheckCircle2 className="text-white h-12 w-12" />
              </div>
            </div>
            <CardContent className="p-10 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-navy">Đã gửi yêu cầu!</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Yêu cầu đăng ký của bạn đã được gửi tới Quản trị viên. 
                  Vui lòng chờ Admin phê duyệt để có thể đăng nhập và bình luận.
                </p>
              </div>
              <Link to="/">
                <Button className="w-full h-12 rounded-xl bg-navy hover:bg-slate-800 text-white font-bold">
                  Quay lại Trang chủ
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-navy font-bold transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại
        </Link>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
          <div className="bg-navy p-8 text-center space-y-2">
            <div className="bg-amber w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="text-navy h-6 w-6" />
            </div>
            <CardTitle className="text-2xl text-white">Đăng ký tài khoản</CardTitle>
            <p className="text-slate-400 text-sm">Tham gia cộng đồng để trao đổi tài liệu</p>
          </div>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy uppercase tracking-wider">Họ và Tên</label>
                <Input 
                  placeholder="Nguyễn Văn A" 
                  className="h-12 rounded-xl border-slate-200 focus:border-amber focus:ring-amber"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy uppercase tracking-wider">Tên tài khoản</label>
                <Input 
                  placeholder="username" 
                  className="h-12 rounded-xl border-slate-200 focus:border-amber focus:ring-amber"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy uppercase tracking-wider">Mật khẩu</label>
                <Input 
                  type="password" 
                  className="h-12 rounded-xl border-slate-200 focus:border-amber focus:ring-amber"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-navy uppercase tracking-wider">Nhập lại mật khẩu</label>
                <Input 
                  type="password" 
                  className="h-12 rounded-xl border-slate-200 focus:border-amber focus:ring-amber"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-navy hover:bg-slate-800 text-white font-bold transition-all mt-4" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Gửi yêu cầu đăng ký
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
