import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/src/lib/firebase';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, Clock, FileText, UserCheck } from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  duration: number;
  questionCount: number;
  createdAt: number;
  allowedAttempts: number;
}

interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  createdAt: number;
}

interface ExamUnlock {
  examId: string;
  studentId: string;
}

export default function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [unlocks, setUnlocks] = useState<ExamUnlock[]>([]);
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<{fullName: string, class: string, username: string} | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('student_session');
    if (!session) {
      navigate('/thi-online');
      return;
    }
    const student = JSON.parse(session);
    setStudentInfo(student);

    // Fetch exams
    const qExams = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
    const unsubscribeExams = onSnapshot(qExams, (snapshot) => {
      const examsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(examsData);
    });

    // Fetch results for this student
    const qResults = query(
      collection(db, 'examResults'), 
      where('studentId', '==', student.username),
      orderBy('createdAt', 'asc')
    );
    const unsubscribeResults = onSnapshot(qResults, (snapshot) => {
      const resultsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        examId: doc.data().examId, 
        studentId: doc.data().studentId,
        score: doc.data().score,
        createdAt: doc.data().createdAt
      } as ExamResult));
      setResults(resultsData);
    });

    // Fetch unlocks for this student
    const qUnlocks = query(collection(db, 'examUnlocks'), where('studentId', '==', student.username));
    const unsubscribeUnlocks = onSnapshot(qUnlocks, (snapshot) => {
      const unlocksData = snapshot.docs.map(doc => doc.data() as ExamUnlock);
      setUnlocks(unlocksData);
    });

    return () => {
      unsubscribeExams();
      unsubscribeResults();
      unsubscribeUnlocks();
    };
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
        {exams.map(exam => {
          const examResults = results.filter(r => r.examId === exam.id);
          const attemptCount = examResults.length;
          const unlockCount = unlocks.filter(u => u.examId === exam.id).length;
          const totalAllowed = (exam.allowedAttempts || 1) + unlockCount;
          const isLimitReached = attemptCount >= totalAllowed;

          return (
            <Card 
              key={exam.id} 
              className={`transition-all duration-500 border-2 flex flex-col ${
                isLimitReached 
                ? 'opacity-60 grayscale-[0.5] border-slate-100 shadow-none' 
                : 'opacity-100 grayscale-0 border-white shadow-lg hover:shadow-2xl hover:-translate-y-1 bg-white'
              }`}
            >
              <CardHeader className="pb-3 relative">
                {!isLimitReached && (
                  <div className="absolute -top-2 -right-2 bg-amber text-navy text-[10px] font-black px-2 py-1 rounded-lg shadow-sm animate-bounce">
                    {attemptCount > 0 ? 'LÀM LẠI' : 'SẴN SÀNG'}
                  </div>
                )}
                <CardTitle className={`text-xl line-clamp-2 leading-snug transition-colors ${isLimitReached ? 'text-slate-400' : 'text-navy'}`}>
                  {exam.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-2 mb-6">
                  <div className={`flex items-center transition-colors ${isLimitReached ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Clock className="w-4 h-4 mr-2 opacity-70" />
                    <span>Thời gian: <strong className={isLimitReached ? 'text-slate-400' : 'text-navy'}>{exam.duration} phút</strong></span>
                  </div>
                  <div className={`flex items-center transition-colors ${isLimitReached ? 'text-slate-400' : 'text-slate-600'}`}>
                    <FileText className="w-4 h-4 mr-2 opacity-70" />
                    <span>Số câu hỏi: <strong className={isLimitReached ? 'text-slate-400' : 'text-navy'}>{exam.questionCount} câu</strong></span>
                  </div>
                  <div className={`flex items-center transition-colors ${isLimitReached ? 'text-slate-400' : 'text-slate-600'}`}>
                    <UserCheck className="w-4 h-4 mr-2 opacity-70" />
                    <span>Số lần đã làm: <strong className={isLimitReached ? 'text-red-400' : 'text-navy'}>{attemptCount} / {totalAllowed}</strong></span>
                  </div>
                </div>

                {examResults.length > 0 && (
                  <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Kết quả các lượt làm:</p>
                    <div className="space-y-2">
                      {examResults.map((res, idx) => (
                        <div key={res.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-sm font-medium text-slate-500">Lần {idx + 1}:</span>
                          <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md">{res.score.toFixed(2)} đ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {isLimitReached ? (
                  <Button 
                    disabled
                    className="w-full bg-slate-100 text-slate-400 font-bold h-12 rounded-xl border border-slate-200"
                  >
                    Đã hết lượt làm bài
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-navy hover:bg-navy/90 text-white font-bold h-12 rounded-xl shadow-md hover:shadow-lg transition-all"
                    onClick={() => navigate(`/preview-exam/${exam.id}`)}
                  >
                    {attemptCount > 0 ? 'Làm lại bài thi' : 'Bắt đầu làm bài'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {exams.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-500 text-lg">Hiện tại chưa có bài kiểm tra nào.</p>
          </div>
        )}
      </div>
    </div>
  );
}
