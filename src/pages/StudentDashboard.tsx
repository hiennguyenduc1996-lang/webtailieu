import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/src/lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, Clock, FileText } from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  duration: number;
  questionCount: number;
  createdAt: number;
}

export default function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<{fullName: string, class: string} | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('student_session');
    if (!session) {
      navigate('/thi-online');
      return;
    }
    setStudentInfo(JSON.parse(session));

    // For now, we show all exams. In a real app, you might filter by class or published status.
    const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(examsData);
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('student_session');
    navigate('/thi-online');
  };

  if (!studentInfo) return null;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex justify-between items-center mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-navy">Xin chào, {studentInfo.fullName}</h1>
          <p className="text-slate-500 mt-1 text-lg">Lớp: {studentInfo.class}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </Button>
      </div>

      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BookOpen className="text-amber" />
        Danh sách bài kiểm tra
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => (
          <Card key={exam.id} className="hover:shadow-lg transition-shadow border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl line-clamp-2 leading-snug">{exam.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-slate-600">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  <span>Thời gian: <strong className="text-navy">{exam.duration} phút</strong></span>
                </div>
                <div className="flex items-center text-slate-600">
                  <FileText className="w-4 h-4 mr-2 text-slate-400" />
                  <span>Số câu hỏi: <strong className="text-navy">{exam.questionCount} câu</strong></span>
                </div>
              </div>
              <Button 
                className="w-full bg-navy hover:bg-navy/90 text-white font-bold h-12"
                onClick={() => navigate(`/preview-exam/${exam.id}`)}
              >
                Bắt đầu làm bài
              </Button>
            </CardContent>
          </Card>
        ))}
        {exams.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-500 text-lg">Hiện tại chưa có bài kiểm tra nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
