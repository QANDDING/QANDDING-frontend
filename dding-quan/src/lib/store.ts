export type Question = {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
};

const questions: Question[] = [];

export function addQuestion(q: Omit<Question, 'id' | 'createdAt'>): Question {
  const created = {
    ...q,
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    hasAnswer: false,
    isAdopted: false,
  } as Question;
  questions.unshift(created);
  return created;
}

export function getQuestion(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

export function listQuestions(page: number, pageSize: number): {
  items: Question[];
  total: number;
  page: number;
  pageSize: number;
} {
  const total = questions.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: questions.slice(start, end),
    total,
    page,
    pageSize,
  };
}


