import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy text-white py-16 border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="bg-amber p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-navy" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Học Liệu Số</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Nền tảng chia sẻ tài liệu học tập miễn phí cho học sinh và giáo viên. 
              Cùng nhau xây dựng cộng đồng học tập vững mạnh và hiện đại.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-amber uppercase tracking-widest text-xs mb-6">Danh mục</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="/" className="hover:text-white transition-colors">Tài liệu mới</a></li>
              <li><a href="/category/provincial" className="hover:text-white transition-colors">Đề Trường Sở</a></li>
              <li><a href="/category/specialized" className="hover:text-white transition-colors">Đề Trường Chuyên</a></li>
              <li><a href="/category/thematic" className="hover:text-white transition-colors">Tài liệu Chuyên đề</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-amber uppercase tracking-widest text-xs mb-6">Liên hệ</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>Email: contact@hoclieuso.vn</li>
              <li>Facebook: fb.com/hoclieuso</li>
              <li>Hỗ trợ: support@hoclieuso.vn</li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Học Liệu Số. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
            <a href="#" className="hover:text-white transition-colors">Bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
