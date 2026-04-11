import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '@/src/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Download, Trash2, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Exam {
  id: string;
  title: string;
  answers: string[];
}

interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  class: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  tabSwitchCount: number;
  createdAt: number;
  studentAnswers: string[];
}

export default function ExamStatsPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      const docRef = doc(db, 'exams', examId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setExam({ id: docSnap.id, ...docSnap.data() } as Exam);
      } else {
        toast.error('Không tìm thấy đề thi');
        navigate('/thi-online/teacher');
      }
    };
    fetchExam();
  }, [examId, navigate]);

  useEffect(() => {
    if (!examId) return;
    const q = query(collection(db, 'examResults'), where('examId', '==', examId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setResults(resultsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [examId]);

  const handleAllowRetake = async (studentId: string) => {
    try {
      if (!examId) return;
      await addDoc(collection(db, 'examUnlocks'), {
        examId,
        studentId,
        unlockedAt: Date.now()
      });
      toast.success('Đã mở khóa, học sinh có thể làm thêm lượt mới');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi mở khóa');
    }
  };

  const exportToExcel = () => {
    if (!exam || results.length === 0) return;

    const data = results.map(res => {
      const row: any = {
        'Họ và tên': res.studentName,
        'Lớp': res.class,
        'Số câu đúng': res.correctCount,
        'Tổng điểm': res.score.toFixed(2),
        'Số lần thoát tab': res.tabSwitchCount,
        'Thời gian làm (giây)': res.timeTaken,
      };

      // Add answers
      exam.answers.forEach((correctAnswer, index) => {
        row[`Câu ${index + 1} (HS chọn)`] = res.studentAnswers[index] || '';
        row[`Câu ${index + 1} (Đáp án đúng)`] = correctAnswer;
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kết quả');
    XLSX.writeFile(workbook, `Ket_qua_${exam.title.replace(/\s+/g, '_')}.xlsx`);
  };

  if (loading) return <div className="flex justify-center items-center h-screen text-2xl font-bold text-navy">Đang tải dữ liệu thống kê...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/thi-online/teacher')} className="rounded-xl h-12">
              <ArrowLeft className="w-5 h-5 mr-2" /> Quay lại
            </Button>
            <h1 className="text-3xl font-extrabold text-navy tracking-tight">
              Thống kê kết quả: <span className="text-amber">{exam?.title}</span>
            </h1>
          </div>
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg">
            <Download className="w-5 h-5 mr-2" /> Xuất file Excel
          </Button>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-navy text-white p-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCheck className="text-amber" /> Danh sách học sinh đã làm bài ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-navy font-bold border-b border-slate-200">
                    <th className="p-4">Học sinh</th>
                    <th className="p-4">Lớp</th>
                    <th className="p-4 text-center">Số câu đúng</th>
                    <th className="p-4 text-center">Điểm số</th>
                    <th className="p-4 text-center">Thoát tab</th>
                    <th className="p-4 text-center">Thời gian</th>
                    <th className="p-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 text-lg">Chưa có học sinh nào làm bài này.</td>
                    </tr>
                  ) : (
                    results.map(res => (
                      <tr key={res.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-navy">{res.studentName}</div>
                          <div className="text-xs text-slate-500">{res.studentId}</div>
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{res.class}</td>
                        <td className="p-4 text-center font-bold text-navy">{res.correctCount} / {res.totalQuestions}</td>
                        <td className="p-4 text-center">
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-lg">
                            {res.score.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {res.tabSwitchCount > 0 ? (
                            <span className="text-red-500 font-extrabold flex items-center justify-center gap-1">
                              {res.tabSwitchCount} lần
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-4 text-center text-slate-600">
                          {Math.floor(res.timeTaken / 60)}p {res.timeTaken % 60}s
                        </td>
                        <td className="p-4 text-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-amber border-amber hover:bg-amber hover:text-navy font-bold rounded-lg"
                            onClick={() => handleAllowRetake(res.studentId)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Cho làm lại
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
