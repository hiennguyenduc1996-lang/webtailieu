import { Link } from 'react-router-dom';
import { BookOpen, Search, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Tài liệu mới', href: '/' },
    { name: 'Đề Trường Sở', href: '/category/provincial' },
    { name: 'Đề Trường Chuyên', href: '/category/specialized' },
    { name: 'Tài liệu Chuyên đề', href: '/category/thematic' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-navy text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-amber p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-navy" />
              </div>
              <span className="text-xl font-bold tracking-tight">Đề Thi Tiếng Anh NK12</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-sm font-medium transition-colors hover:text-amber"
              >
                {link.name}
              </Link>
            ))}
            <Link to="/admin" className="hover:text-amber transition-colors">
              <User className="h-5 w-5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {isOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium transition-colors hover:text-primary"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/admin"
                className="text-sm font-medium transition-colors hover:text-primary"
                onClick={() => setIsOpen(false)}
              >
                Quản trị
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
