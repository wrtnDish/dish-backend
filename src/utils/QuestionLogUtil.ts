import { promises as fs } from 'fs';
import { join } from 'path';

interface QuestionLogEntry {
  chat: string;
  day: string;
}

export namespace QuestionLogUtil {

  const LOG_DIR = join(process.cwd(), 'src', 'utils','history');
  const QUESTIONS_FILE = join(LOG_DIR, 'user_history.json');

  const getKoreanDayOfWeek = (): string => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date();
    return days[today.getDay()];
  };

  // 기존 질문 로그들 읽어오기
  export const readQuestionLogs = async (): Promise<QuestionLogEntry[]> => {
    try {
      const data = await fs.readFile(QUESTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  };

  // 새로운 질문 저장하기
  export const saveQuestion = async (userQuestion: string): Promise<void> => {
    try {
      const existingLogs = await readQuestionLogs();

      const newEntry: QuestionLogEntry = {
        chat: userQuestion,
        day: getKoreanDayOfWeek()
      };

      existingLogs.push(newEntry);

      await fs.writeFile(QUESTIONS_FILE, JSON.stringify(existingLogs, null, 2), 'utf-8');

    } catch (error) {
      throw error;
    }
  };

  // 특정 요일의 질문들만 조회
  export const getQuestionsByDay = async (dayOfWeek: string): Promise<QuestionLogEntry[]> => {
    const allLogs = await readQuestionLogs();
    return allLogs.filter(log => log.day === dayOfWeek);
  };

  // 전체 질문 개수 조회
  export const getTotalQuestionCount = async (): Promise<number> => {
    const allLogs = await readQuestionLogs();
    return allLogs.length;
  };
}
