export type Question = {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
};

const STORAGE_KEY = 'dq_questions_v1';

function safeGetStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getAllQuestions(): Question[] {
  const storage = safeGetStorage();
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Question[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAllQuestions(questions: Question[]): void {
  const storage = safeGetStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(questions));
}

export function addQuestionLocal(data: Omit<Question, 'id' | 'createdAt'>): Question {
  const list = getAllQuestions();
  const created: Question = {
    ...data,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    hasAnswer: data.hasAnswer ?? false,
    isAdopted: data.isAdopted ?? false,
  };
  list.unshift(created);
  saveAllQuestions(list);
  return created;
}

export function getQuestionById(id: string): Question | undefined {
  return getAllQuestions().find((q) => q.id === id);
}

export function listQuestionsLocal(page: number, pageSize: number) {
  const list = getAllQuestions();
  const total = list.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: list.slice(start, end),
    total,
    page,
    pageSize,
  };
}


