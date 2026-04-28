import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, query, onSnapshot, orderBy, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { read, utils, writeFile } from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/src/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Trash2, UserPlus, FileUp } from 'lucide-react';

const examSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  pdfUrl: z.string().url('URL không hợp lệ'),
  duration: z.number().min(1, 'Thời gian phải lớn hơn 0'),
  questionCount: z.number().min(1, 'Số câu hỏi phải lớn hơn 0'),
  allowedAttempts: z.number().min(1, 'Số lần làm bài tối thiểu là 1'),
  resultDisplayMode: z.enum(['ALL', 'SCORE', 'HIDE']),
  subject: z.enum(['ENGLISH', 'SCIENCE', 'MATH']),
});

const studentSchema = z.object({
  fullName: z.string().min(1, 'Họ và tên là bắt buộc'),
  username: z.string().min(1, 'Tên tài khoản là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  className: z.string().min(1, 'Lớp là bắt buộc'),
});

interface Exam {
  id: string;
  title: string;
  pdfUrl: string;
  duration: number;
  isPublished: boolean;
  createdAt: number;
  answers: string[];
  questionCount: number;
  allowedAttempts: number;
  resultDisplayMode: 'ALL' | 'SCORE' | 'HIDE';
  subject: 'ENGLISH' | 'SCIENCE' | 'MATH';
}

interface StudentAccount {
  id: string;
  fullName: string;
  username: string;
  password: string;
  class: string;
}

interface ExamFormValues {
  title: string;
  pdfUrl: string;
  duration: number;
  questionCount: number;
  allowedAttempts: number;
  resultDisplayMode: 'ALL' | 'SCORE' | 'HIDE';
  subject: 'ENGLISH' | 'SCIENCE' | 'MATH';
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

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      pdfUrl: '',
      duration: 60,
      questionCount: 40,
      allowedAttempts: 1,
      resultDisplayMode: 'ALL',
      subject: 'ENGLISH',
    },
  });

  const { register: registerStudent, handleSubmit: handleSubmitStudent, reset: resetStudent, formState: { errors: studentErrors } } = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
  });

  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<StudentAccount[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const questionCount = watch('questionCount');
  const [answers, setAnswers] = useState<string[]>(() => Array(40).fill(''));
  const [answerInputType, setAnswerInputType] = useState<'select' | 'string'>('select');
  const [answerString, setAnswerString] = useState('');
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentAccount | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/thi-online');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const count = Math.max(0, Math.min(500, Math.floor(Number(questionCount) || 0)));
    setAnswers(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array(count - prev.length).fill('A')];
      }
      return prev.slice(0, count);
    });
  }, [questionCount]);

  useEffect(() => {
    const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(examsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'studentAccounts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentAccount));
      setStudents(studentsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'examResults'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resultsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));
      setResults(resultsData);
    });
    return () => unsubscribe();
  }, []);

  async function onSubmit(values: ExamFormValues) {
    let finalAnswers = answers;
    if (answerInputType === 'string') {
      // Parse string like 1A2B3C or ABC
      const parsed = answerString.match(/[ABCD]/gi);
      if (parsed && parsed.length === values.questionCount) {
        finalAnswers = parsed.map(a => a.toUpperCase());
      } else {
        toast.error(`Chuỗi đáp án không hợp lệ. Cần ${values.questionCount} đáp án.`);
        return;
      }
    }

    try {
      if (editingExamId) {
        await updateDoc(doc(db, 'exams', editingExamId), {
          ...values,
          answers: finalAnswers,
        });
        toast.success('Đã cập nhật đề thi thành công');
        setEditingExamId(null);
      } else {
        await addDoc(collection(db, 'exams'), {
          ...values,
          answers: finalAnswers,
          isPublished: false,
          createdAt: Date.now(),
        });
        toast.success('Đã lưu đề thi thành công');
      }
      reset();
      setActiveTab('manage');
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi lưu đề thi');
    }
  }

  const handleEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    reset({
      title: exam.title,
      pdfUrl: exam.pdfUrl,
      duration: exam.duration,
      questionCount: exam.questionCount,
      allowedAttempts: exam.allowedAttempts,
      resultDisplayMode: exam.resultDisplayMode || 'ALL',
    });
    setAnswers(exam.answers);
    setAnswerInputType('select'); // Default to select for editing for simplicity
    setActiveTab('create');
  };

  const handleCancelEdit = () => {
    setEditingExamId(null);
    reset({
      title: '',
      pdfUrl: '',
      duration: 60,
      questionCount: 40,
      allowedAttempts: 1,
      resultDisplayMode: 'ALL',
    });
    setAnswers(Array(40).fill('A'));
    setActiveTab('manage');
  };

  const handleDeleteExam = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đề thi này?')) {
      await deleteDoc(doc(db, 'exams', id));
      toast.success('Đã xóa đề thi');
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json(worksheet) as any[];
        
        let count = 0;
        for (const row of json) {
          if (row['Họ và tên'] && row['Tên tài khoản'] && row['Mật khẩu'] && row['Lớp']) {
            const username = String(row['Tên tài khoản']);
            await setDoc(doc(db, 'studentAccounts', username), {
              fullName: String(row['Họ và tên']),
              username: username,
              password: String(row['Mật khẩu']),
              class: String(row['Lớp']),
            });
            count++;
          }
        }
        toast.success(`Đã thêm ${count} tài khoản từ file`);
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi đọc file Excel');
      }
    };
    reader.readAsBinaryString(file);
  };

  const onSubmitStudent = async (values: z.infer<typeof studentSchema>) => {
    try {
      if (editingStudent) {
        // If username changed, we need to delete old and create new, or just disable username editing.
        // For simplicity, let's just use setDoc which will create new if changed, but we should delete old.
        if (editingStudent.id !== values.username) {
          await deleteDoc(doc(db, 'studentAccounts', editingStudent.id));
        }
        await setDoc(doc(db, 'studentAccounts', values.username), {
          fullName: values.fullName,
          username: values.username,
          password: values.password,
          class: values.className,
        });
        toast.success('Đã cập nhật tài khoản');
      } else {
        await setDoc(doc(db, 'studentAccounts', values.username), {
          fullName: values.fullName,
          username: values.username,
          password: values.password,
          class: values.className,
        });
        toast.success('Đã tạo tài khoản mới');
      }
      setIsStudentDialogOpen(false);
      resetStudent();
      setEditingStudent(null);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi lưu tài khoản');
    }
  };

  const handleEditStudent = (student: StudentAccount) => {
    setEditingStudent(student);
    resetStudent({
      fullName: student.fullName,
      username: student.username,
      password: student.password,
      className: student.class,
    });
    setIsStudentDialogOpen(true);
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      await deleteDoc(doc(db, 'studentAccounts', id));
      setSelectedStudents(prev => prev.filter(sid => sid !== id));
      toast.success('Đã xóa tài khoản');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedStudents.length} tài khoản đã chọn?`)) {
      try {
        for (const id of selectedStudents) {
          await deleteDoc(doc(db, 'studentAccounts', id));
        }
        setSelectedStudents([]);
        toast.success(`Đã xóa ${selectedStudents.length} tài khoản`);
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi xóa nhiều tài khoản');
      }
    }
  };

  const exportStudentsToExcel = () => {
    if (students.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const data = students.map(s => ({
      'Họ và tên': s.fullName,
      'Tên tài khoản': s.username,
      'Mật khẩu': s.password,
      'Lớp': s.class
    }));

    const worksheet = utils.json_to_sheet(data);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Danh sách học sinh');
    writeFile(workbook, 'Danh_sach_hoc_sinh.xlsx');
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleAllowRetake = async (studentId: string, examId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa kết quả của học sinh này để làm lại?')) {
      try {
        const studentResults = results.filter(r => r.examId === examId && r.studentId === studentId);
        for (const res of studentResults) {
          await deleteDoc(doc(db, 'examResults', res.id));
        }
        toast.success('Đã xóa kết quả, học sinh có thể làm lại');
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi xóa kết quả');
      }
    }
  };

  const getStudentStats = (examId: string) => {
    const examResults = results.filter(r => r.examId === examId);
    // Group by studentId, keep highest score
    const studentStats = Object.values(examResults.reduce((acc, curr) => {
      if (!acc[curr.studentId] || curr.score > acc[curr.studentId].score) {
        acc[curr.studentId] = curr;
      }
      return acc;
    }, {} as Record<string, ExamResult>));
    
    return studentStats.sort((a, b) => b.score - a.score);
  };

  const filteredAndSortedExams = exams
    .filter(exam => exam.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt; // newest
    });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold mb-10 text-navy tracking-tight">Dashboard Giáo viên</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-10 p-1 bg-slate-100 rounded-xl h-14">
          <TabsTrigger value="create" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">
            {editingExamId ? 'SỬA ĐỀ' : 'TẠO ĐỀ'}
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">QUẢN LÝ ĐỀ</TabsTrigger>
          <TabsTrigger value="accounts" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm uppercase">TÀI KHOẢN</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card className="shadow-lg border-slate-100">
            <CardHeader>
              <CardTitle className="text-2xl font-bold uppercase">
                {editingExamId ? `ĐANG SỬA: ${watch('title')}` : 'TẠO ĐỀ THI MỚI'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-bold uppercase">TIÊU ĐỀ</Label>
                  <Input placeholder="Nhập tiêu đề đề thi" className="h-12 text-lg font-bold" {...register('title')} />
                  {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-bold uppercase">URL</Label>
                  <Input placeholder="Nhập URL file PDF" className="h-12 text-lg font-bold" {...register('pdfUrl')} />
                  {errors.pdfUrl && <p className="text-red-500 text-sm">{errors.pdfUrl.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-bold uppercase">THỜI GIAN</Label>
                  <Input type="number" className="h-12 text-lg font-bold" {...register('duration')} />
                  {errors.duration && <p className="text-red-500 text-sm">{errors.duration.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-bold uppercase">SỐ LƯỢNG CÂU HỎI</Label>
                  <Input type="number" className="h-12 text-lg font-bold" {...register('questionCount', { valueAsNumber: true })} />
                  {errors.questionCount && <p className="text-red-500 text-sm">{errors.questionCount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-bold uppercase">SỐ LẦN LÀM BÀI TỐI ĐA</Label>
                  <Input type="number" className="h-12 text-lg font-bold" {...register('allowedAttempts', { valueAsNumber: true })} />
                  {errors.allowedAttempts && <p className="text-red-500 text-sm">{errors.allowedAttempts.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-bold uppercase">MÔN HỌC</Label>
                  <Select 
                    value={watch('subject')} 
                    onValueChange={(v) => setValue('subject', v as any)}
                  >
                    <SelectTrigger className="h-12 text-lg font-bold uppercase border-2 border-slate-200 rounded-xl bg-white">
                      <SelectValue placeholder="CHỌN MÔN HỌC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENGLISH" className="font-bold uppercase">TIẾNG ANH</SelectItem>
                      <SelectItem value="SCIENCE" className="font-bold uppercase">VẬT LÍ - HÓA - SINH</SelectItem>
                      <SelectItem value="MATH" className="font-bold uppercase">TOÁN HỌC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-bold uppercase">CHẾ ĐỘ HIỂN THỊ KẾT QUẢ SAU KHI NỘP</Label>
                  <Select 
                    value={watch('resultDisplayMode')} 
                    onValueChange={(v) => setValue('resultDisplayMode', v as any)}
                  >
                    <SelectTrigger className="h-12 text-lg font-bold uppercase border-2 border-slate-200 rounded-xl bg-white">
                      <SelectValue placeholder="CHỌN CHẾ ĐỘ HIỂN THỊ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="font-bold uppercase">ĐÚNG, ĐIỂM, CÂU SAI</SelectItem>
                      <SelectItem value="SCORE" className="font-bold uppercase">ĐÚNG, ĐIỂM (ẨN CÂU SAI)</SelectItem>
                      <SelectItem value="HIDE" className="font-bold uppercase">KHÔNG HIỂN THỊ GÌ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4">
                  <Label className="text-lg font-black uppercase">CẤU TRÚC VÀ ĐÁP ÁN</Label>
                  <Tabs value={watch('subject')} onValueChange={(v) => setValue('subject', v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-12">
                      <TabsTrigger value="ENGLISH">TIẾNG ANH</TabsTrigger>
                      <TabsTrigger value="SCIENCE">VẬT LÍ - HÓA - SINH</TabsTrigger>
                      <TabsTrigger value="MATH">TOÁN HỌC</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="ENGLISH" className="space-y-4 pt-4">
                       <p className="text-sm text-slate-500">40 câu Trắc nghiệm (Chọn A, B, C, D)</p>
                       <div className="grid grid-cols-5 gap-2">
                        {answers.slice(0, 40).map((answer, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <span className="text-sm font-bold w-6">{index + 1}.</span>
                            <Select value={answer || ''} onValueChange={(val) => handleAnswerChange(index, val)}>
                              <SelectTrigger className="w-20 h-10 font-bold border-2 border-slate-200"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                                <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="SCIENCE" className="space-y-4 pt-4">
                      <h4 className="font-bold text-navy">PHẦN 1: 18 TRẮC NGHIỆM</h4>
                      {Array.from({length: 2}).map((_, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-9 gap-2">
                          {Array.from({length: 9}).map((_, colIndex) => {
                            const idx = rowIndex * 9 + colIndex;
                            return (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="text-xs font-bold w-5 text-slate-500">{idx + 1}.</span>
                                <Select value={answers[idx] || ''} onValueChange={(val) => handleAnswerChange(idx, val)}>
                                  <SelectTrigger className="w-16 h-8 font-bold border-2 border-slate-200"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem></SelectContent>
                                </Select>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                      
                      <h4 className="font-bold text-navy pt-4">PHẦN 2: 4 NHÓM CÂU ĐÚNG/SAI</h4>
                      {Array.from({length: 4}).map((_, groupIndex) => (
                        <div key={groupIndex} className="flex items-center gap-4 py-2 border-b">
                          <span className="font-bold w-12 text-sm">Câu {19 + groupIndex}:</span>
                          {Array.from({length: 4}).map((_, itemIndex) => {
                            const idx = 18 + groupIndex * 4 + itemIndex;
                            return (
                                <Select key={idx} value={answers[idx] || ''} onValueChange={(val) => handleAnswerChange(idx, val)}>
                                  <SelectTrigger className="w-24 h-8 font-bold border-2 border-slate-200 shrink-0"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="T">Đúng</SelectItem><SelectItem value="F">Sai</SelectItem></SelectContent>
                                </Select>
                            )
                          })}
                        </div>
                      ))}

                      <h4 className="font-bold text-navy pt-4">PHẦN 3: 6 TỰ LUẬN NGẮN (ĐIỀN SỐ)</h4>
                      {Array.from({length: 6}).map((_, index) => {
                        const idx = 34 + index;
                        return (
                          <div key={idx} className="flex items-center gap-4">
                            <Label className="w-20 font-bold">Câu {35 + index}:</Label>
                            <Input value={answers[idx] || ''} onChange={(e) => handleAnswerChange(idx, e.target.value)} placeholder="Nhập đáp án (vd: 12.5)" className="h-10" />
                          </div>
                      )})}
                    </TabsContent>
                    
                    <TabsContent value="MATH" className="space-y-4 pt-4">
                      <h4 className="font-bold text-navy">PHẦN 1: 12 TRẮC NGHIỆM</h4>
                      {Array.from({length: 2}).map((_, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-6 gap-2">
                          {Array.from({length: 6}).map((_, colIndex) => {
                            const idx = rowIndex * 6 + colIndex;
                            return (
                              <div key={idx} className="flex items-center gap-1">
                                <span className="text-xs font-bold w-5 text-slate-500">{idx + 1}.</span>
                                <Select value={answers[idx] || ''} onValueChange={(val) => handleAnswerChange(idx, val)}>
                                  <SelectTrigger className="w-16 h-8 font-bold border-2 border-slate-200"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem></SelectContent>
                                </Select>
                              </div>
                            )
                          })}
                        </div>
                      ))}

                      <h4 className="font-bold text-navy pt-4">PHẦN 2: 4 NHÓM CÂU ĐÚNG/SAI</h4>
                      {Array.from({length: 4}).map((_, groupIndex) => (
                        <div key={groupIndex} className="flex items-center gap-4 py-2 border-b">
                          <span className="font-bold w-12 text-sm">Câu {13 + groupIndex}:</span>
                          {Array.from({length: 4}).map((_, itemIndex) => {
                            const idx = 12 + groupIndex * 4 + itemIndex;
                            return (
                                <Select key={idx} value={answers[idx] || ''} onValueChange={(val) => handleAnswerChange(idx, val)}>
                                  <SelectTrigger className="w-24 h-8 font-bold border-2 border-slate-200 shrink-0"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="T">Đúng</SelectItem><SelectItem value="F">Sai</SelectItem></SelectContent>
                                </Select>
                            )
                          })}
                        </div>
                      ))}

                      <h4 className="font-bold text-navy pt-4">PHẦN 3: 6 TỰ LUẬN NGẮN (ĐIỀN SỐ)</h4>
                      {Array.from({length: 6}).map((_, index) => {
                        const idx = 28 + index;
                        return (
                          <div key={idx} className="flex items-center gap-4">
                            <Label className="w-20 font-bold">Câu {29 + index}:</Label>
                            <Input value={answers[idx] || ''} onChange={(e) => handleAnswerChange(idx, e.target.value)} placeholder="Nhập đáp án (vd: 12.5)" className="h-10" />
                          </div>
                      )})}
                    </TabsContent>
                  </Tabs>
                </div>
                <div className="flex gap-4">
                  <Button type="submit" className="h-12 px-8 text-lg font-bold bg-navy hover:bg-navy/90 transition-all hover:scale-[1.02]">
                    {editingExamId ? 'Cập nhật đề thi' : 'Lưu đề thi'}
                  </Button>
                  {editingExamId && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} className="h-12 px-8 text-lg font-bold">
                      Hủy sửa
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manage">
          <Card className="shadow-lg border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <CardTitle className="text-2xl font-bold uppercase">DANH SÁCH ĐỀ THI</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative w-64">
                  <Input 
                    placeholder="Tìm kiếm đề thi..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-4 h-10"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-40 h-10 font-bold border-2 border-slate-200">
                    <SelectValue placeholder="SẮP XẾP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">MỚI NHẤT</SelectItem>
                    <SelectItem value="oldest">CŨ NHẤT</SelectItem>
                    <SelectItem value="name">TÊN (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAndSortedExams.map(exam => (
                  <div key={exam.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div>
                      <h3 className="font-bold text-lg text-navy">{exam.title}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-slate-500">Thời gian: {exam.duration} phút - {exam.questionCount} câu</p>
                        <p className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Ngày tạo: {new Date(exam.createdAt).toLocaleDateString('vi-VN')} {new Date(exam.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black border-2 border-blue-800 uppercase shadow-md transition-all hover:scale-110"
                        onClick={() => handleEditExam(exam)}
                      >
                        SỬA
                      </Button>
                      <Button 
                        variant="destructive" 
                        className="bg-red-600 hover:bg-red-700 text-white font-black border-2 border-red-800 uppercase shadow-md transition-all hover:scale-110"
                        onClick={() => handleDeleteExam(exam.id)}
                      >
                        XÓA
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-2 border-slate-800 text-slate-800 font-black hover:bg-slate-800 hover:text-white uppercase shadow-md transition-all hover:scale-110"
                        onClick={() => window.open(`/preview-exam/${exam.id}`, '_blank')}
                      >
                        XEM TRƯỚC
                      </Button>
                      <Button 
                        variant="default" 
                        className="bg-amber hover:bg-amber/90 text-navy font-black border-2 border-amber-600 uppercase shadow-md transition-all hover:scale-110" 
                        onClick={() => navigate(`/thi-online/stats/${exam.id}`)}
                      >
                        THỐNG KÊ
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="accounts">
          <Card className="shadow-lg border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <CardTitle className="text-2xl font-bold uppercase">QUẢN LÝ TÀI KHOẢN HỌC SINH</CardTitle>
              <div className="flex gap-3">
                <Button 
                  onClick={exportStudentsToExcel} 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 px-4 rounded-xl shadow-lg transition-all hover:scale-105"
                >
                  <Download className="w-4 h-4 mr-2" /> XUẤT EXCEL
                </Button>
                <Dialog open={isStudentDialogOpen} onOpenChange={(open) => {
                  setIsStudentDialogOpen(open);
                  if (!open) {
                    resetStudent();
                    setEditingStudent(null);
                  }
                }}>
                  <DialogTrigger render={
                    <Button className="bg-navy hover:bg-navy/90 font-bold h-10 px-4 rounded-xl shadow-lg transition-all hover:scale-105 text-white">
                      <UserPlus className="w-4 h-4 mr-2" /> TẠO TÀI KHOẢN
                    </Button>
                  } />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="uppercase font-bold">{editingStudent ? 'SỬA TÀI KHOẢN' : 'TẠO TÀI KHOẢN MỚI'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitStudent(onSubmitStudent)} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="font-bold uppercase">HỌ VÀ TÊN</Label>
                        <Input {...registerStudent('fullName')} className="font-bold" />
                        {studentErrors.fullName && <p className="text-red-500 text-sm">{studentErrors.fullName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold uppercase">TÊN TÀI KHOẢN</Label>
                        <Input {...registerStudent('username')} className="font-bold" />
                        {studentErrors.username && <p className="text-red-500 text-sm">{studentErrors.username.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold uppercase">MẬT KHẨU</Label>
                        <Input type="text" {...registerStudent('password')} className="font-bold" />
                        {studentErrors.password && <p className="text-red-500 text-sm">{studentErrors.password.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold uppercase">LỚP</Label>
                        <Input {...registerStudent('className')} className="font-bold" />
                        {studentErrors.className && <p className="text-red-500 text-sm">{studentErrors.className.message}</p>}
                      </div>
                      <Button type="submit" className="w-full bg-navy font-bold h-12 text-lg uppercase shadow-lg text-white">{editingStudent ? 'CẬP NHẬT' : 'TẠO MỚI'}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Label className="text-base font-bold uppercase flex items-center gap-2 mb-2">
                    <FileUp className="w-5 h-5 text-navy" /> TẢI LÊN FILE EXCEL DANH SÁCH HỌC SINH
                  </Label>
                  <p className="text-sm text-slate-500 mb-4">File Excel cần có các cột: <strong>Họ và tên, Tên tài khoản, Mật khẩu, Lớp</strong></p>
                  <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="bg-white border-2 h-12 pt-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-navy uppercase">DANH SÁCH HỌC SINH ({students.length})</h3>
                    {selectedStudents.length > 0 && (
                      <Button 
                        variant="destructive" 
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700 font-black border-2 border-red-800 uppercase shadow-lg animate-in fade-in slide-in-from-right-4"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> XÓA ĐÃ CHỌN ({selectedStudents.length})
                      </Button>
                    )}
                  </div>

                  <div className="border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-navy font-black border-b-2 border-slate-200">
                          <th className="p-4 w-12">
                            <Checkbox 
                              checked={selectedStudents.length === students.length && students.length > 0}
                              onCheckedChange={toggleSelectAll}
                              className="border-2 border-navy data-[state=checked]:bg-navy"
                            />
                          </th>
                          <th className="p-4 uppercase">HỌ VÀ TÊN</th>
                          <th className="p-4 uppercase">TÀI KHOẢN</th>
                          <th className="p-4 uppercase">LỚP</th>
                          <th className="p-4 uppercase text-center">HÀNH ĐỘNG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(student => (
                          <tr key={student.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedStudents.includes(student.id) ? 'bg-blue-50/50' : ''}`}>
                            <td className="p-4">
                              <Checkbox 
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={() => toggleSelectStudent(student.id)}
                                className="border-2 border-slate-400 data-[state=checked]:bg-navy data-[state=checked]:border-navy"
                              />
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-navy">{student.fullName}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-bold text-slate-600">{student.username}</div>
                              <div className="text-xs text-slate-400 font-mono">MK: {student.password}</div>
                            </td>
                            <td className="p-4">
                              <span className="bg-slate-200 text-navy px-3 py-1 rounded-full text-xs font-black">{student.class}</span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-2">
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handleEditStudent(student)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold border-2 border-blue-800 shadow-lg transition-all hover:scale-110"
                                >
                                  SỬA
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold border-2 border-red-800 shadow-lg transition-all hover:scale-110"
                                >
                                  XÓA
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-500 font-bold text-lg uppercase">Chưa có tài khoản học sinh nào.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
