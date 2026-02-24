// Types
export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  data: Array<{ name: string; value: number; [key: string]: string | number }>;
}

export interface GeneratedImage {
  id: string;
  cameraName: string;
  imageFile: string;
  timestamp: string;
}

export interface StoreData {
  version: number;
  generatedImages: GeneratedImage[];
  visionAnalyses: VisionAnalysis[];
  chatSessions: ChatSession[];
  sustainabilityReports: SustainabilityReport[];
  dashboardSnapshots: DashboardSnapshot[];
}

export interface VisionAnalysis {
  id: string;
  cameraName: string;
  imageFile: string | null;
  task: string;
  result: { objects?: any[]; summary: string; charts?: ChartSpec[] };
  timestamp: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  startedAt: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  charts?: ChartSpec[];
  timestamp?: string;
}

export interface SustainabilityReport {
  id: string;
  inputData: any;
  report: string;
  charts: ChartSpec[];
  timestamp: string;
}

export interface DashboardSnapshot {
  id: string;
  insights: DashboardInsight[];
  charts: ChartSpec[];
  stats: any;
  text?: string;
  timestamp: string;
}

export interface DashboardInsight {
  type: 'opportunity' | 'alert' | 'info';
  title: string;
  description: string;
}

// Error handling

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isRateLimit() { return this.status === 429; }
  get isUnavailable() { return this.status === 503; }
  get isAuthError() { return this.status === 403 || this.status === 401; }
}

async function handleResponse<T>(response: Response, fallbackMsg: string): Promise<T> {
  if (!response.ok) {
    let message = fallbackMsg;
    let code = 'UNKNOWN';
    try {
      const body = await response.json();
      message = body.error || message;
      code = body.code || code;
    } catch {
      // response wasn't JSON — use status text
      message = `${fallbackMsg} (${response.status} ${response.statusText})`;
    }
    throw new ApiError(message, response.status, code);
  }
  return await response.json() as T;
}

/** User-friendly error message for display in the UI */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

// Gemini API functions

export async function generateVisionExample(prompt: string) {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  const data = await handleResponse<{ image: string | null; error?: string }>(response, 'Falha ao gerar imagem');
  return data.image;
}

export async function analyzeImage(imageBase64: string, task: string) {
  const response = await fetch('/api/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData: imageBase64, task }),
  });

  return await handleResponse<{ objects?: any[]; summary: string; charts?: ChartSpec[] }>(response, 'Falha ao analisar imagem');
}

export async function getStoreInsights(query: string, context: any) {
  const response = await fetch('/api/store-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context }),
  });

  return await handleResponse<{ text: string; charts: ChartSpec[] }>(response, 'Falha ao obter insights');
}

export async function getSustainabilityReport(data: any) {
  const response = await fetch('/api/sustainability-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });

  return await handleResponse<{ text: string; charts: ChartSpec[] }>(response, 'Falha ao gerar relatório de sustentabilidade');
}

export async function getDashboardInsights(stats?: any) {
  const response = await fetch('/api/dashboard-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stats }),
  });

  return await handleResponse<{ text: string; insights: DashboardInsight[]; charts: ChartSpec[] }>(response, 'Falha ao gerar insights do dashboard');
}

// Persistence functions

export async function loadAllData(): Promise<StoreData> {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Failed to load data');
  return await response.json();
}

export async function saveVisionAnalysis(data: { cameraName: string; imageData: string; task: string; result: any }) {
  const response = await fetch('/api/data/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save vision analysis');
  return await response.json();
}

export async function saveChatSession(data: { id?: string; messages: ChatMessage[] }) {
  const response = await fetch('/api/data/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save chat session');
  return await response.json();
}

export async function saveSustainabilityReport(data: { inputData: any; report: string; charts: ChartSpec[] }) {
  const response = await fetch('/api/data/sustainability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save sustainability report');
  return await response.json();
}

export async function saveDashboardSnapshot(data: { insights: DashboardInsight[]; charts: ChartSpec[]; stats: any; text?: string }) {
  const response = await fetch('/api/data/dashboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save dashboard snapshot');
  return await response.json();
}

export async function saveGeneratedImage(data: { cameraName: string; imageData: string }): Promise<GeneratedImage> {
  const response = await fetch('/api/data/generated-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save generated image');
  return await response.json();
}

export async function deleteEntry(collection: string, id: string) {
  const response = await fetch(`/api/data/${collection}/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete entry');
  return await response.json();
}
