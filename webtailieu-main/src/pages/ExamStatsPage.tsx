import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '@/src/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, deleteDoc, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Download, Trash2, UserCheck, Search, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';

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
  startedAt?: number;
  finishedAt?: number;
  createdAt: number;
  studentAnswers: string[];
}

export default function ExamStatsPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExamResult; direction: 'asc' | 'desc' } | null>(null);

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

  const handleDeleteResult = async (resultId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn kết quả này? Hành động này không thể hoàn tác.')) {
      try {
        await deleteDoc(doc(db, 'examResults', resultId));
        toast.success('Đã xóa kết quả thành công');
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi xóa kết quả');
      }
    }
  };

  const handleSort = (key: keyof ExamResult) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedResults = results
    .filter(res => 
      res.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.class.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      
      let aVal: any = a[key];
      let bVal: any = b[key];

      // Special handling for time fields that might use fallbacks
      if (key === 'startedAt') {
        aVal = a.startedAt || (a.createdAt - a.timeTaken * 1000);
        bVal = b.startedAt || (b.createdAt - b.timeTaken * 1000);
      } else if (key === 'finishedAt') {
        aVal = a.finishedAt || a.createdAt;
        bVal = b.finishedAt || b.createdAt;
      } else {
        // Default values for undefined/null to ensure correct sorting
        const isStringKey = ['studentName', 'class', 'studentId'].includes(key as string);
        if (aVal === undefined || aVal === null) aVal = isStringKey ? '' : 0;
        if (bVal === undefined || bVal === null) bVal = isStringKey ? '' : 0;
      }
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ columnKey }: { columnKey: keyof ExamResult }) => {
    if (sortConfig?.key !== columnKey) return <div className="w-4 h-4 opacity-20"><ChevronUp className="w-4 h-4" /></div>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-amber" /> : <ChevronDown className="w-4 h-4 text-amber" />;
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const exportToExcel = () => {
    if (!exam || results.length === 0) return;

    const data = results.map(res => {
      const startTime = res.startedAt || (res.createdAt - res.timeTaken * 1000);
      const endTime = res.finishedAt || res.createdAt;

      const row: any = {
        'Họ và tên': res.studentName,
        'Lớp': res.class,
        'Số câu đúng': res.correctCount,
        'Tổng điểm': res.score.toFixed(2),
        'Số lần thoát tab': res.tabSwitchCount,
        'Bắt đầu': formatDateTime(startTime),
        'Kết thúc': formatDateTime(endTime),
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
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-6 rounded-xl shadow-lg transition-all hover:scale-105">
            <Download className="w-5 h-5 mr-2" /> Xuất file Excel
          </Button>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              placeholder="Tìm kiếm theo tên học sinh, mã số hoặc lớp..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg rounded-2xl border-none shadow-lg bg-white font-medium"
            />
          </div>
        </div>

        <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="bg-navy text-white p-6">
            <CardTitle className="text-xl flex items-center gap-2 uppercase font-black">
              <UserCheck className="text-amber" /> DANH SÁCH HỌC SINH ĐÃ LÀM BÀI ({filteredAndSortedResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-navy font-black border-b-2 border-slate-200">
                    <th className="p-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('studentName')}>
                      <div className="flex items-center gap-1 uppercase">HỌC SINH <SortIcon columnKey="studentName" /></div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('class')}>
                      <div className="flex items-center gap-1 uppercase">LỚP <SortIcon columnKey="class" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('correctCount')}>
                      <div className="flex items-center justify-center gap-1 uppercase">SỐ CÂU ĐÚNG <SortIcon columnKey="correctCount" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('score')}>
                      <div className="flex items-center justify-center gap-1 uppercase">ĐIỂM SỐ <SortIcon columnKey="score" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('tabSwitchCount')}>
                      <div className="flex items-center justify-center gap-1 uppercase">THOÁT TAB <SortIcon columnKey="tabSwitchCount" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('startedAt')}>
                      <div className="flex items-center justify-center gap-1 uppercase">BẮT ĐẦU <SortIcon columnKey="startedAt" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('finishedAt')}>
                      <div className="flex items-center justify-center gap-1 uppercase">KẾT THÚC <SortIcon columnKey="finishedAt" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort('timeTaken')}>
                      <div className="flex items-center justify-center gap-1 uppercase">THỜI GIAN <SortIcon columnKey="timeTaken" /></div>
                    </th>
                    <th className="p-4 text-center uppercase">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500 text-lg font-bold uppercase">Không tìm thấy kết quả phù hợp.</td>
                    </tr>
                  ) : (
                    filteredAndSortedResults.map(res => (
                      <tr key={res.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-navy text-lg">{res.studentName}</div>
                          <div className="text-xs text-slate-500 font-mono">{res.studentId}</div>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-200 text-navy px-3 py-1 rounded-full text-xs font-black">{res.class}</span>
                        </td>
                        <td className="p-4 text-center font-black text-navy text-lg">{res.correctCount} / {res.totalQuestions}</td>
                        <td className="p-4 text-center">
                          <span className="bg-green-600 text-white px-4 py-1 rounded-xl font-black text-xl shadow-md">
                            {res.score.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {res.tabSwitchCount > 0 ? (
                            <span className="text-red-600 font-black text-lg bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                              {res.tabSwitchCount} lần
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold italic">0</span>
                          )}
                        </td>
                        <td className="p-4 text-center text-slate-600 font-medium text-sm">
                          {formatDateTime(res.startedAt || (res.createdAt - res.timeTaken * 1000))}
                        </td>
                        <td className="p-4 text-center text-slate-600 font-medium text-sm">
                          {formatDateTime(res.finishedAt || res.createdAt)}
                        </td>
                        <td className="p-4 text-center text-slate-600 font-bold">
                          {Math.floor(res.timeTaken / 60)}p {res.timeTaken % 60}s
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <Button 
                              variant="default" 
                              size="sm"
                              className="bg-amber hover:bg-amber/90 text-navy font-black border-2 border-amber-600 uppercase shadow-md transition-all hover:scale-110"
                              onClick={() => handleAllowRetake(res.studentId)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" /> Cho làm lại
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white font-black border-2 border-red-800 uppercase shadow-md transition-all hover:scale-110"
                              onClick={() => handleDeleteResult(res.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" /> Xóa
                            </Button>
                          </div>
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
