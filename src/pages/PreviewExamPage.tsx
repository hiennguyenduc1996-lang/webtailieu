import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Clock, Send, ExternalLink, AlertTriangle } from 'lucide-react';
import { calculateScore } from '@/src/lib/scoring';

interface Exam {
  id: string;
  title: string;
  pdfUrl: string;
  duration: number;
  answers: string[];
  questionCount: number;
  allowedAttempts: number;
  resultDisplayMode?: 'ALL' | 'SCORE' | 'HIDE';
  subject: 'ENGLISH' | 'SCIENCE' | 'MATH';
}

export default function PreviewExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showViolationModal && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (showViolationModal && countdown === 0) {
      setShowViolationModal(false);
      handleSubmit(); // Automatically submit
      toast.error('Hết thời gian quay lại! Đề thi đã tự động nộp.');
    }
    return () => clearInterval(interval);
  }, [showViolationModal, countdown]);

  useEffect(() => {
    const fetchExamAndCheckAttempts = async () => {
      if (!examId) return;
      
      // 1. Fetch Exam
      const docRef = doc(db, 'exams', examId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        toast.error('Không tìm thấy đề thi');
        navigate('/thi-online');
        return;
      }
      
      const examData = { id: docSnap.id, ...docSnap.data() } as Exam;
      
      // 2. Check Attempts if student is logged in
      const session = localStorage.getItem('student_session');
      if (session) {
        const student = JSON.parse(session);
        
        // Check results
        const qResults = query(
          collection(db, 'examResults'), 
          where('examId', '==', examId),
          where('studentId', '==', student.username)
        );
        const resultsSnap = await getDocs(qResults);
        const attemptCount = resultsSnap.size;

        // Check unlocks
        const qUnlocks = query(
          collection(db, 'examUnlocks'),
          where('examId', '==', examId),
          where('studentId', '==', student.username)
        );
        const unlocksSnap = await getDocs(qUnlocks);
        const unlockCount = unlocksSnap.size;
        
        const totalAllowed = (examData.allowedAttempts || 1) + unlockCount;
        
        if (attemptCount >= totalAllowed) {
          toast.error('Bạn đã hết lượt làm bài thi này.');
          navigate('/thi-online/student');
          return;
        }
      }

      setExam(examData);
      setTimeLeft(examData.duration * 60);
      setStudentAnswers(Array(examData.questionCount || examData.answers?.length || 0).fill(''));
      setStartedAt(Date.now());
    };
    
    fetchExamAndCheckAttempts();
  }, [examId, navigate]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !hasSubmitted) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && !hasSubmitted) {
      handleSubmit();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, hasSubmitted]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !hasSubmitted && isExamStarted) {
        handleViolation();
      }
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !hasSubmitted && isExamStarted) {
        handleViolation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [hasSubmitted, isExamStarted, violationCount]);

  const handleViolation = () => {
    setShowViolationModal(true);
    setCountdown(5);
  };

  const confirmReturn = () => {
    setShowViolationModal(false);
    const newCount = violationCount + 1;
    setViolationCount(newCount);
    setTabSwitchCount(prev => prev + 1);

    if (newCount >= 3) {
      toast.error('Bạn đã vi phạm 3 lần. Hệ thống tự động nộp bài!');
      handleSubmit();
    } else {
      toast.warning(`Cảnh báo vi phạm (${newCount}/3): Đừng thoát khỏi màn hình làm bài!`, {
        icon: <AlertTriangle className="text-amber" />
      });
      // Attempt to re-enter fullscreen
      document.documentElement.requestFullscreen().catch(err => console.error("Fullscreen re-entry error:", err));
    }
  };

  const handleAnswerSelect = (index: number, option: string) => {
    if (hasSubmitted) return;
    const newAnswers = [...studentAnswers];
    newAnswers[index] = option;
    setStudentAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (!exam || hasSubmitted) return;
    setIsSubmitting(true);
    
    // Calculate score
    const { score: finalScore, correctCount } = calculateScore(exam, studentAnswers);
    
    const now = Date.now();
    setScore(finalScore);
    setHasSubmitted(true);
    
    // Save result if student is logged in
    const session = localStorage.getItem('student_session');
    if (session) {
      try {
        const student = JSON.parse(session);
        await addDoc(collection(db, 'examResults'), {
          examId: exam.id,
          studentId: student.username,
          studentName: student.fullName,
          class: student.class,
          score: finalScore,
          correctCount,
          totalQuestions: exam.answers.length,
          timeTaken: (exam.duration * 60) - (timeLeft || 0),
          tabSwitchCount,
          startedAt: startedAt || (now - ((exam.duration * 60) - (timeLeft || 0)) * 1000),
          finishedAt: now,
          createdAt: now,
          studentAnswers
        });
        toast.success('Đã nộp bài thành công!');
      } catch (error) {
        console.error('Error saving result:', error);
        toast.error('Lỗi khi lưu kết quả.');
      }
    } else {
      toast.success('Đã nộp bài (Chế độ xem trước)!');
    }
    setIsSubmitting(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const driveIdRegex = /(?:id=|\/d\/|folders\/|file\/d\/)([a-zA-Z0-9-_]{25,})/;
    const match = url.match(driveIdRegex);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url;
  };

  const getDriveOpenUrl = (url: string) => {
    if (!url) return '';
    const driveIdRegex = /(?:id=|\/d\/|folders\/|file\/d\/)([a-zA-Z0-9-_]{25,})/;
    const match = url.match(driveIdRegex);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/view`;
    }
    return url;
  };

  const startExam = () => {
    setIsExamStarted(true);
    setStartedAt(Date.now());
    document.documentElement.requestFullscreen().catch(err => toast.error('Không thể kích hoạt toàn màn hình.'));
  };

  if (!exam) return <div className="flex justify-center items-center h-screen text-2xl font-bold text-navy">Đang tải đề thi...</div>;

  if (!isExamStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 gap-6">
        <h1 className="text-4xl font-extrabold text-navy">{exam.title}</h1>
        <p className="text-xl text-slate-600">Thời gian làm bài: {exam.duration} phút</p>
        <Button onClick={startExam} className="bg-navy text-white hover:bg-navy/90 text-2xl font-bold px-12 py-8 rounded-3xl">
          BẮT ĐẦU LÀM BÀI
        </Button>
      </div>
    );
  }

  const answeredCount = studentAnswers.filter(a => a !== '').length;

  return (
    <>
    {showViolationModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white p-8 rounded-3xl text-center shadow-2xl max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-navy mb-2">CẢNH BÁO VI PHẠM</h2>
          <p className="text-slate-600 mb-6">Bạn đã thoát khỏi màn hình làm bài. Hành động này bị nghiêm cấm. Bạn đã vi phạm lần thứ {violationCount + 1}. Tự động nộp bài sau {countdown} giây.</p>
          <Button onClick={confirmReturn} className="bg-navy text-white font-bold px-8 py-3 rounded-2xl w-full">
            TÔI ĐÃ HIỂU, QUAY LẠI LÀM BÀI ({countdown}s)
          </Button>
        </div>
      </div>
    )}
    
    <div className="container mx-auto px-4 py-8 max-w-[1600px] font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-navy tracking-tight">{exam.title}</h1>
        {hasSubmitted && (
          <div className="flex gap-4 items-center">
            {exam.resultDisplayMode !== 'HIDE' && (
              <>
                {tabSwitchCount > 0 && (
                  <div className="bg-red-100 text-red-800 px-5 py-2.5 rounded-2xl font-bold text-base border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Thoát tab: {tabSwitchCount} lần
                  </div>
                )}
                {score !== null && (
                  <div className="bg-green-100 text-green-800 px-8 py-2.5 rounded-2xl font-bold text-xl border border-green-200">
                    Điểm số: {score.toFixed(2)} / 10 ({Math.round((score/10) * exam.answers.length)}/{exam.answers.length} câu)
                  </div>
                )}
              </>
            )}
            <Button 
              onClick={() => {
                const studentSession = localStorage.getItem('student_session');
                if (studentSession) {
                  navigate('/thi-online/student');
                } else if (auth.currentUser) {
                  navigate('/thi-online/teacher');
                } else {
                  navigate('/thi-online');
                }
              }}
              className="bg-navy text-white hover:bg-navy/90 font-bold px-6 py-2.5 rounded-2xl text-base"
            >
              Về danh sách đề
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: PDF Viewer */}
        <div className="lg:col-span-3 h-[80vh] bg-slate-900 rounded-3xl overflow-hidden border-none shadow-2xl relative group">
          <iframe 
            src={getEmbedUrl(exam.pdfUrl)} 
            className="w-full h-full border-none"
            title="PDF Viewer"
            allow="autoplay"
          />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={getDriveOpenUrl(exam.pdfUrl)} target="_blank" rel="noreferrer">
              <Button className="bg-white/90 hover:bg-white text-navy font-bold rounded-2xl shadow-lg h-11 px-6 text-base">
                <ExternalLink className="h-5 w-5 mr-2" /> Mở trong Drive
              </Button>
            </a>
          </div>
        </div>

        {/* Right Column: Answers & Timer */}
        <div className="lg:col-span-1 flex flex-col h-[80vh]">
          <Card className="border-none shadow-2xl flex-1 flex flex-col overflow-hidden rounded-3xl">
            <CardHeader className="bg-navy text-white p-6 shrink-0 rounded-t-3xl">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 font-mono text-4xl font-bold text-amber">
                    <Clock className="w-8 h-8" />
                    {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                  </div>
                  {!hasSubmitted && (
                    <Button 
                      onClick={handleSubmit} 
                      disabled={isSubmitting}
                      className="bg-amber text-navy hover:bg-amber/90 font-bold px-8 py-6 rounded-2xl text-lg shadow-lg hover:scale-105 transition-transform"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Nộp bài
                    </Button>
                  )}
                </div>
                <div className="bg-slate-800/50 rounded-2xl p-3 text-center text-base font-semibold text-slate-200">
                  Đã chọn: <span className="text-amber font-bold text-lg">{answeredCount}</span> / {exam.questionCount || exam.answers.length} câu
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0 flex-1 overflow-y-auto bg-slate-50/50">
              <div className="p-4 space-y-6">
                {exam.subject === 'ENGLISH' ? (
                  studentAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-2xl border-2 border-transparent shadow-sm hover:border-amber/30 hover:shadow-md transition-all duration-300">
                      <span className="font-extrabold text-navy text-base">Câu {index + 1}.</span>
                      <div className="flex gap-2">
                        {['A', 'B', 'C', 'D'].map(option => (
                           <Button 
                            key={option} 
                            variant="ghost" 
                            className={`w-10 h-10 rounded-xl font-bold transition-all ${
                              hasSubmitted 
                                ? (exam.resultDisplayMode === 'ALL' && exam.answers[index] === option ? "bg-green-500 text-white" : (hasSubmitted && studentAnswers[index] === option && exam.answers[index] !== option ? "bg-red-500 text-white" : "bg-slate-50 text-slate-300"))
                                : (studentAnswers[index] === option ? "bg-navy text-white" : "bg-white text-slate-500")
                            }`}
                            onClick={() => handleAnswerSelect(index, option)}
                            disabled={hasSubmitted}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <h3 className="font-bold text-lg text-navy">PHẦN 1: TRẮC NGHIỆM</h3>
                    {/* Part 1: MCQ (Science: 0-17, Math: 0-11) */}
                    {(exam.subject === 'SCIENCE' ? studentAnswers.slice(0, 18) : studentAnswers.slice(0, 12)).map((answer, index) => (
                       <div key={index} className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm">
                        <span className="font-extrabold text-navy">Câu {index + 1}.</span>
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D'].map(option => (
                            <Button key={option} variant="ghost" className={`w-10 h-10 rounded-xl font-bold ${
                              hasSubmitted ? (exam.resultDisplayMode === 'ALL' && exam.answers[index] === option ? "bg-green-500 text-white" : (hasSubmitted && studentAnswers[index] === option && exam.answers[index] !== option ? "bg-red-500 text-white" : "bg-slate-50")) : (studentAnswers[index] === option ? "bg-navy text-white" : "bg-white")
                            }`} onClick={() => handleAnswerSelect(index, option)} disabled={hasSubmitted}>{option}</Button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <h3 className="font-bold text-lg text-navy pt-4">PHẦN 2: ĐÚNG / SAI</h3>
                    {/* Part 2: TF Groups (4 groups of 4) */}
                    {Array.from({ length: 4 }).map((_, groupIndex) => {
                      const baseIndex = exam.subject === 'SCIENCE' ? 18 : 12;
                      return (
                        <div key={groupIndex} className="bg-white p-4 rounded-2xl shadow-sm space-y-2">
                          <h4 className="font-bold text-navy">Câu hỏi {groupIndex + 1}</h4>
                          {['a', 'b', 'c', 'd'].map((sub, subIndex) => {
                            const idx = baseIndex + groupIndex * 4 + subIndex;
                            return (
                              <div key={sub} className="flex items-center justify-between">
                                <span className="font-semibold">Ý {sub.toUpperCase()}</span>
                                <div className="flex gap-2">
                                  {['T', 'F'].map(option => (
                                    <Button key={option} variant="ghost" className={`w-12 h-10 rounded-xl font-bold ${
                                      hasSubmitted ? (exam.resultDisplayMode === 'ALL' && exam.answers[idx] === option ? "bg-green-500 text-white" : (hasSubmitted && studentAnswers[idx] === option && exam.answers[idx] !== option ? "bg-red-500 text-white" : "bg-slate-50")) : (studentAnswers[idx] === option ? "bg-navy text-white" : "bg-white")
                                    }`} onClick={() => handleAnswerSelect(idx, option)} disabled={hasSubmitted}>{option}</Button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    <h3 className="font-bold text-lg text-navy pt-4">PHẦN 3: TỰ LUẬN NGẮN</h3>
                    {/* Part 3: Short Answer (Science: 34-39, Math: 28-33) */}
                    {(exam.subject === 'SCIENCE' ? studentAnswers.slice(34, 40) : studentAnswers.slice(28, 34)).map((answer, subIndex) => {
                      const idx = (exam.subject === 'SCIENCE' ? 34 : 28) + subIndex;
                      return (
                        <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm">
                          <span className="font-extrabold text-navy">Câu {idx - (exam.subject === 'SCIENCE' ? 34 : 28) + 1}.</span>
                          <input 
                            type="text" 
                            className="border-2 rounded-xl p-2 font-bold text-center w-24"
                            value={answer}
                            onChange={(e) => handleAnswerSelect(idx, e.target.value)}
                            disabled={hasSubmitted}
                            placeholder="Đáp án..."
                          />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}
