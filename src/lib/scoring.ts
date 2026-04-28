interface Exam {
  id: string;
  answers: string[];
  subject: 'ENGLISH' | 'SCIENCE' | 'MATH';
}

export const calculateScore = (exam: Exam, studentAnswers: string[]): { score: number, correctCount: number } => {
    let finalScore = 0;
    let correctCount = 0;

    if (exam.subject === 'ENGLISH') {
        for (let i = 0; i < exam.answers.length; i++) {
            if (studentAnswers[i] === exam.answers[i]) {
                correctCount++;
            }
        }
        finalScore = (correctCount / exam.answers.length) * 10;
    } else if (exam.subject === 'SCIENCE') {
        // Part 1: 18 MCQ (0-17)
        for (let i = 0; i < 18; i++) {
            if (studentAnswers[i] === exam.answers[i]) {
                finalScore += 0.25;
                correctCount++;
            }
        }
        // Part 2: 16 True/False (18-33)
        for (let i = 0; i < 4; i++) {
            let correctInGroup = 0;
            for (let j = 0; j < 4; j++) {
                if (studentAnswers[18 + i * 4 + j] === exam.answers[18 + i * 4 + j]) {
                    correctInGroup++;
                    correctCount++;
                }
            }
            if (correctInGroup === 1) finalScore += 0.1;
            else if (correctInGroup === 2) finalScore += 0.25;
            else if (correctInGroup === 3) finalScore += 0.5;
            else if (correctInGroup === 4) finalScore += 1.0;
        }
        // Part 3: 6 short (34-39)
        for (let i = 0; i < 6; i++) {
            if (studentAnswers[34 + i] === exam.answers[34 + i]) {
                finalScore += 0.25;
                correctCount++;
            }
        }
    } else if (exam.subject === 'MATH') {
        // Part 1: 12 MCQ (0-11)
        for (let i = 0; i < 12; i++) {
            if (studentAnswers[i] === exam.answers[i]) {
                finalScore += 0.25;
                correctCount++;
            }
        }
        // Part 2: 16 True/False (12-27)
        for (let i = 0; i < 4; i++) {
            let correctInGroup = 0;
            for (let j = 0; j < 4; j++) {
                if (studentAnswers[12 + i * 4 + j] === exam.answers[12 + i * 4 + j]) {
                    correctInGroup++;
                    correctCount++;
                }
            }
            if (correctInGroup === 1) finalScore += 0.1;
            else if (correctInGroup === 2) finalScore += 0.25;
            else if (correctInGroup === 3) finalScore += 0.5;
            else if (correctInGroup === 4) finalScore += 1.0;
        }
        // Part 3: 6 short (28-33)
        for (let i = 0; i < 6; i++) {
            if (studentAnswers[28 + i] === exam.answers[28 + i]) {
                finalScore += 0.5;
                correctCount++;
            }
        }
    } else {
        // Default
        for (let i = 0; i < exam.answers.length; i++) {
            if (studentAnswers[i] === exam.answers[i]) {
                correctCount++;
            }
        }
        finalScore = (correctCount / exam.answers.length) * 10;
    }
    
    return { score: finalScore, correctCount };
};
