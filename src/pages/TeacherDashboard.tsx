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
import { read, utils } from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/src/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const examSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  pdfUrl: z.string().url('URL không hợp lệ'),
  duration: z.number().min(1, 'Thời gian phải lớn hơn 0'),
  questionCount: z.number().min(1, 'Số câu hỏi phải lớn hơn 0'),
  allowedAttempts: z.number().min(1, 'Số lần làm bài tối thiểu là 1'),
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

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      pdfUrl: '',
      duration: 60,
      questionCount: 40,
      allowedAttempts: 1,
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
  const questionCount = watch('questionCount');
  const [answers, setAnswers] = useState<string[]>(() => Array(40).fill('A'));
  const [answerInputType, setAnswerInputType] = useState<'select' | 'string'>('select');
  const [answerString, setAnswerString] = useState('');
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentAccount | null>(null);

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
      toast.success('Đã xóa tài khoản');
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

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold mb-10 text-navy tracking-tight">Dashboard Giáo viên</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-10 p-1 bg-slate-100 rounded-xl h-14">
          <TabsTrigger value="create" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            {editingExamId ? 'Sửa đề' : 'Tạo đề'}
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Quản lý đề</TabsTrigger>
          <TabsTrigger value="accounts" className="text-lg font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Tài khoản</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card className="shadow-lg border-slate-100">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                {editingExamId ? `Đang sửa: ${watch('title')}` : 'Tạo đề thi mới'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Tiêu đề</Label>
                  <Input placeholder="Nhập tiêu đề đề thi" className="h-12 text-lg" {...register('title')} />
                  {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">URL PDF</Label>
                  <Input placeholder="Nhập URL file PDF" className="h-12 text-lg" {...register('pdfUrl')} />
                  {errors.pdfUrl && <p className="text-red-500 text-sm">{errors.pdfUrl.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Thời gian (phút)</Label>
                  <Input type="number" className="h-12 text-lg" {...register('duration')} />
                  {errors.duration && <p className="text-red-500 text-sm">{errors.duration.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Số lượng câu hỏi</Label>
                  <Input type="number" className="h-12 text-lg" {...register('questionCount', { valueAsNumber: true })} />
                  {errors.questionCount && <p className="text-red-500 text-sm">{errors.questionCount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Số lần làm bài tối đa</Label>
                  <Input type="number" className="h-12 text-lg" {...register('allowedAttempts', { valueAsNumber: true })} />
                  {errors.allowedAttempts && <p className="text-red-500 text-sm">{errors.allowedAttempts.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Cách nhập đáp án</Label>
                  <Select value={answerInputType} onValueChange={(v: any) => setAnswerInputType(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select">Chọn từng câu</SelectItem>
                      <SelectItem value="string">Nhập chuỗi (VD: 1A2B3C)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {answerInputType === 'select' ? (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Đáp án ({questionCount} câu)</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {answers.map((answer, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <span className="text-sm font-medium w-6">{index + 1}.</span>
                          <Select value={answer} onValueChange={(val) => handleAnswerChange(index, val)}>
                            <SelectTrigger className="w-16"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Chuỗi đáp án</Label>
                    <Input value={answerString} onChange={(e) => setAnswerString(e.target.value)} placeholder="VD: 1A2B3C..." className="h-12 text-lg" />
                  </div>
                )}
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
            <CardHeader><CardTitle className="text-2xl font-bold">Danh sách đề thi</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exams.map(exam => (
                  <div key={exam.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-bold">{exam.title}</h3>
                      <p className="text-sm text-slate-500">Thời gian: {exam.duration} phút - {exam.questionCount} câu</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEditExam(exam)}>Sửa</Button>
                      <Button variant="destructive" onClick={() => handleDeleteExam(exam.id)}>Xóa</Button>
                      <Button variant="outline" onClick={() => window.open(`/preview-exam/${exam.id}`, '_blank')}>Xem trước</Button>
                      <Button variant="default" className="bg-amber hover:bg-amber/90 text-navy font-bold" onClick={() => navigate(`/thi-online/stats/${exam.id}`)}>Thống kê</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="accounts">
          <Card className="shadow-lg border-slate-100">
            <CardHeader className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Quản lý tài khoản học sinh</CardTitle>
              <Dialog open={isStudentDialogOpen} onOpenChange={(open) => {
                setIsStudentDialogOpen(open);
                if (!open) {
                  resetStudent();
                  setEditingStudent(null);
                }
              }}>
                <DialogTrigger render={
                  <Button className="bg-navy hover:bg-navy/90">Tạo tài khoản</Button>
                } />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingStudent ? 'Sửa tài khoản' : 'Tạo tài khoản mới'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitStudent(onSubmitStudent)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Họ và Tên</Label>
                      <Input {...registerStudent('fullName')} />
                      {studentErrors.fullName && <p className="text-red-500 text-sm">{studentErrors.fullName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Tên tài khoản</Label>
                      <Input {...registerStudent('username')} />
                      {studentErrors.username && <p className="text-red-500 text-sm">{studentErrors.username.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Mật khẩu</Label>
                      <Input type="password" {...registerStudent('password')} />
                      {studentErrors.password && <p className="text-red-500 text-sm">{studentErrors.password.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Lớp</Label>
                      <Input {...registerStudent('className')} />
                      {studentErrors.className && <p className="text-red-500 text-sm">{studentErrors.className.message}</p>}
                    </div>
                    <Button type="submit" className="w-full">{editingStudent ? 'Cập nhật' : 'Tạo mới'}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2 p-4 bg-slate-50 rounded-lg border">
                  <Label className="text-base font-semibold">Tải lên file Excel danh sách học sinh</Label>
                  <p className="text-sm text-slate-500 mb-2">File Excel cần có các cột: Họ và tên, Tên tài khoản, Mật khẩu, Lớp</p>
                  <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-4">Danh sách học sinh ({students.length})</h3>
                  <div className="space-y-2">
                    {students.map(student => (
                      <div key={student.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                        <div>
                          <p className="font-bold">{student.fullName} <span className="text-sm font-normal text-slate-500">- Lớp: {student.class}</span></p>
                          <p className="text-sm text-slate-600">Tài khoản: {student.username} | Mật khẩu: <span className="font-mono text-amber">{student.password}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>Sửa</Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteStudent(student.id)}>Xóa</Button>
                        </div>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-center text-slate-500 py-4">Chưa có tài khoản học sinh nào.</p>
                    )}
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
