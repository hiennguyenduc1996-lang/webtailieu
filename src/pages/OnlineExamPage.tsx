import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth, db } from '@/src/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function OnlineExamPage() {
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentUsername, setStudentUsername] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check student session
    const studentSession = localStorage.getItem('student_session');
    if (studentSession) {
      navigate('/thi-online/student');
      return;
    }

    // Check teacher session
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/thi-online/teacher');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Đăng nhập thành công');
      navigate('/thi-online/teacher');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/invalid-credential') {
        toast.error('Email hoặc mật khẩu không chính xác.');
      } else if (error.code === 'auth/user-not-found') {
        toast.error('Tài khoản không tồn tại.');
      } else {
        toast.error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentDocRef = doc(db, 'studentAccounts', studentUsername);
      const studentDoc = await getDoc(studentDocRef);

      if (!studentDoc.exists()) {
        toast.error('Tài khoản không tồn tại.');
        return;
      }

      const studentData = studentDoc.data();

      if (studentData.password !== studentPassword) {
        toast.error('Mật khẩu không đúng.');
        return;
      }

      // Store student session
      localStorage.setItem('student_session', JSON.stringify({
        id: studentDoc.id,
        username: studentData.username,
        fullName: studentData.fullName,
        class: studentData.class
      }));

      toast.success('Đăng nhập học sinh thành công');
      navigate('/thi-online/student');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi đăng nhập. Vui lòng thử lại.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex justify-center">
      <div className="w-full max-w-lg bg-white p-10 rounded-2xl shadow-2xl border border-slate-100">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-navy tracking-tight">Hệ thống Thi Online</h1>
        <Tabs defaultValue="teacher" onValueChange={(v) => setRole(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger value="teacher" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Giáo viên</TabsTrigger>
            <TabsTrigger value="student" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Học sinh</TabsTrigger>
          </TabsList>
          <TabsContent value="teacher">
            <form onSubmit={handleTeacherLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập email giáo viên" className="h-12 text-lg" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold">Mật khẩu</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" className="h-12 text-lg" required />
              </div>
              <Button type="submit" className="w-full h-14 text-xl font-bold bg-navy hover:bg-navy/90 transition-all hover:scale-[1.02]">Đăng nhập</Button>
            </form>
          </TabsContent>
          <TabsContent value="student">
            <form onSubmit={handleStudentLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="studentId" className="text-base font-semibold">Tên đăng nhập / Mã số</Label>
                <Input id="studentId" value={studentUsername} onChange={(e) => setStudentUsername(e.target.value)} placeholder="Nhập tên đăng nhập" className="h-12 text-lg" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentPassword" className="text-base font-semibold">Mật khẩu</Label>
                <Input id="studentPassword" type="password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} placeholder="Nhập mật khẩu" className="h-12 text-lg" required />
              </div>
              <Button type="submit" className="w-full h-14 text-xl font-bold bg-amber text-navy hover:bg-amber/90 transition-all hover:scale-[1.02]">Đăng nhập</Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
