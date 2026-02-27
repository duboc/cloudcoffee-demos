/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Camera,
  Leaf,
  MessageSquare,
  Bell,
  Search,
  Menu,
  User,
  Settings,
  HelpCircle,
  TrendingUp,
  Users,
  Coffee,
  AlertTriangle,
  Droplets,
  Zap,
  Send,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Save,
  Plus,
  BarChart3,
  Trash2,
  Sunrise,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import {
  getStoreInsights,
  getSustainabilityReport,
  generateVisionExample,
  analyzeImage,
  getDashboardInsights,
  getDailyBriefing,
  analyzeFeedback,
  loadAllData,
  saveGeneratedImage,
  saveVisionAnalysis,
  saveChatSession,
  saveSustainabilityReport,
  saveDashboardSnapshot,
  saveDailyBriefing,
  saveFeedbackAnalysis,
  deleteEntry,
  getUserErrorMessage,
} from './services/gemini';
import type {
  ChartSpec,
  StoreData,
  GeneratedImage,
  VisionAnalysis,
  ChatSession,
  ChatMessage,
  SustainabilityReport,
  DashboardSnapshot,
  DashboardInsight,
  BriefingActionItem,
  DailyBriefing,
  FeedbackReview,
  FeedbackSentiment,
  FeedbackCategory,
  FeedbackImprovement,
  FeedbackAnalysis,
} from './services/gemini';
import Markdown from 'react-markdown';
import { ChartGrid } from './components/GeminiChart';
import HistoryPanel from './components/HistoryPanel';

// Types
type View = 'dashboard' | 'vision' | 'sustainability' | 'chat' | 'briefing' | 'feedback';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  timestamp: string;
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="bg-[#fce8e6] border border-[#f9d2ce] rounded-lg p-4 flex items-start gap-3">
      <AlertTriangle size={18} className="text-[#d93025] mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-[#3c4043]">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-[#5f6368] hover:text-[#202124] text-lg leading-none">&times;</button>
    </div>
  );
}

const emptyStore: StoreData = {
  version: 1,
  generatedImages: [],
  visionAnalyses: [],
  chatSessions: [],
  sustainabilityReports: [],
  dashboardSnapshots: [],
  dailyBriefings: [],
  feedbackAnalyses: [],
};

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', type: 'warning', message: 'Fila no caixa 1 excedeu 5 pessoas.', timestamp: '10:45' },
    { id: '2', type: 'info', message: 'Estoque de Pão de Queijo baixo (2 unidades).', timestamp: '10:30' }
  ]);
  const [storeData, setStoreData] = useState<StoreData>(emptyStore);

  const refreshStore = useCallback(async () => {
    try {
      const data = await loadAllData();
      setStoreData(data);
    } catch (error) {
      console.error('Failed to load store data:', error);
    }
  }, []);

  useEffect(() => {
    refreshStore();
  }, [refreshStore]);

  return (
    <div className="flex h-screen bg-[#f1f3f4] font-sans text-[#3c4043] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-[#dadce0] transition-all duration-300 flex flex-col z-20",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-[#dadce0]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors"
          >
            <Menu size={20} />
          </button>
          {isSidebarOpen && (
            <div className="ml-3 flex items-center gap-2">
              <div className="w-8 h-8 bg-[#4285f4] rounded flex items-center justify-center text-white">
                <Coffee size={18} />
              </div>
              <span className="font-medium text-lg truncate">CloudCoffee</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={activeView === 'dashboard'}
            collapsed={!isSidebarOpen}
            onClick={() => setActiveView('dashboard')}
          />
          <NavItem
            icon={<Camera size={20} />}
            label="Visão Computacional"
            active={activeView === 'vision'}
            collapsed={!isSidebarOpen}
            onClick={() => setActiveView('vision')}
          />
          <NavItem
            icon={<Leaf size={20} />}
            label="Sustentabilidade"
            active={activeView === 'sustainability'}
            collapsed={!isSidebarOpen}
            onClick={() => setActiveView('sustainability')}
          />
          <NavItem
            icon={<MessageSquare size={20} />}
            label="Fale com a Loja"
            active={activeView === 'chat'}
            collapsed={!isSidebarOpen}
            onClick={() => setActiveView('chat')}
          />
          <NavItem
            icon={<Sunrise size={20} />}
            label="Briefing do Dia"
            active={activeView === 'briefing'}
            collapsed={!isSidebarOpen}
            onClick={() => setActiveView('briefing')}
          />
          <NavItem
            icon={<Star size={20} />}
            label="Voz do Cliente"
            active={activeView === 'feedback'}
            collapsed={!isSidebarOpen}
            onClick={() => setActiveView('feedback')}
          />
        </nav>

        <div className="p-4 border-t border-[#dadce0]">
          <NavItem
            icon={<Settings size={20} />}
            label="Configurações"
            collapsed={!isSidebarOpen}
          />
          <NavItem
            icon={<HelpCircle size={20} />}
            label="Ajuda"
            collapsed={!isSidebarOpen}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#dadce0] flex items-center justify-between px-6 z-10">
          <div className="flex items-center flex-1 max-w-2xl">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-[#5f6368]" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border-transparent bg-[#f1f3f4] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#4285f4] focus:border-transparent transition-all outline-none text-sm"
                placeholder="Pesquisar recursos, documentos e mais"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            <button className="p-2 hover:bg-[#f1f3f4] rounded-full relative">
              <Bell size={20} className="text-[#5f6368]" />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="h-8 w-px bg-[#dadce0]"></div>
            <button className="flex items-center gap-2 hover:bg-[#f1f3f4] p-1 pr-2 rounded-full transition-colors">
              <div className="w-8 h-8 bg-[#1a73e8] rounded-full flex items-center justify-center text-white text-sm font-bold">
                GN
              </div>
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' && <DashboardView key="dashboard" alerts={alerts} storeData={storeData} refreshStore={refreshStore} />}
            {activeView === 'vision' && <VisionView key="vision" storeData={storeData} refreshStore={refreshStore} />}
            {activeView === 'sustainability' && <SustainabilityView key="sustainability" storeData={storeData} refreshStore={refreshStore} />}
            {activeView === 'chat' && <ChatView key="chat" storeData={storeData} refreshStore={refreshStore} />}
            {activeView === 'briefing' && <BriefingView key="briefing" storeData={storeData} refreshStore={refreshStore} />}
            {activeView === 'feedback' && <FeedbackView key="feedback" storeData={storeData} refreshStore={refreshStore} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, collapsed, onClick }: {
  icon: React.ReactNode,
  label: string,
  active?: boolean,
  collapsed?: boolean,
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center px-4 py-3 transition-colors relative group",
        active ? "bg-[#e8f0fe] text-[#1967d2]" : "text-[#5f6368] hover:bg-[#f1f3f4]"
      )}
    >
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1967d2]"></div>}
      <div className={cn("flex-shrink-0", active ? "text-[#1967d2]" : "text-[#5f6368]")}>
        {icon}
      </div>
      {!collapsed && (
        <span className="ml-4 text-sm font-medium truncate">{label}</span>
      )}
      {collapsed && (
        <div className="absolute left-16 bg-[#3c4043] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );
}

// ─── Dashboard View ──────────────────────────────────────────────

interface ViewProps {
  storeData: StoreData;
  refreshStore: () => Promise<void>;
}

function DashboardView({ alerts, storeData, refreshStore }: { alerts: Alert[] } & ViewProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [insightsText, setInsightsText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load last snapshot on mount
  useEffect(() => {
    if (storeData.dashboardSnapshots.length > 0) {
      const last = storeData.dashboardSnapshots[0];
      setInsights(last.insights || []);
      setCharts(last.charts || []);
      setInsightsText(last.text || '');
    }
  }, [storeData.dashboardSnapshots]);

  const handleGenerateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardInsights();
      setInsights(result.insights || []);
      setCharts(result.charts || []);
      setInsightsText(result.text || '');

      // Auto-save snapshot
      await saveDashboardSnapshot({
        insights: result.insights || [],
        charts: result.charts || [],
        stats: { text: result.text },
        text: result.text || '',
      });
      refreshStore();
    } catch (err) {
      console.error(err);
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const insightColors: Record<string, { bg: string; border: string; title: string }> = {
    opportunity: { bg: 'bg-[#e8f0fe]', border: 'border-[#d2e3fc]', title: 'text-[#1967d2]' },
    alert: { bg: 'bg-[#fce8e6]', border: 'border-[#f9d2ce]', title: 'text-[#d93025]' },
    info: { bg: 'bg-[#e6f4ea]', border: 'border-[#ceead6]', title: 'text-[#137333]' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-normal text-[#202124]">Visão Geral da Loja</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-[#1a73e8] border border-[#dadce0] rounded hover:bg-[#f8f9fa]">
            Exportar Relatório
          </button>
          <button
            onClick={handleGenerateInsights}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1a73e8] rounded hover:shadow-md disabled:opacity-50"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            {loading ? 'Gerando...' : 'Gerar Insights com Gemini'}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Vendas Hoje"
          value="R$ 4.250,00"
          change="+12%"
          positive={true}
          icon={<TrendingUp size={20} className="text-green-600" />}
        />
        <StatCard
          title="Clientes Atendidos"
          value="142"
          change="+5%"
          positive={true}
          icon={<Users size={20} className="text-blue-600" />}
        />
        <StatCard
          title="Tempo Médio de Espera"
          value="4m 20s"
          change="-30s"
          positive={true}
          icon={<RefreshCw size={20} className="text-orange-600" />}
        />
        <StatCard
          title="Consumo Energético"
          value="12.4 kWh"
          change="+2%"
          positive={false}
          icon={<Zap size={20} className="text-yellow-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Section */}
        <div className="lg:col-span-1 bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[#dadce0] flex items-center justify-between bg-[#f8f9fa]">
            <h2 className="font-medium text-[#202124]">Alertas Ativos</h2>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{alerts.length}</span>
          </div>
          <div className="divide-y divide-[#dadce0]">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 hover:bg-[#f1f3f4] transition-colors flex gap-3">
                <div className={cn(
                  "mt-1",
                  alert.type === 'warning' ? "text-orange-500" : "text-blue-500"
                )}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-sm text-[#3c4043]">{alert.message}</p>
                  <span className="text-xs text-[#70757a]">{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="lg:col-span-2 bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[#dadce0] flex items-center gap-2 bg-[#f8f9fa]">
            <div className="w-6 h-6 bg-gradient-to-br from-[#4285f4] to-[#34a853] rounded-full flex items-center justify-center">
              <SparklesIcon size={14} className="text-white" />
            </div>
            <h2 className="font-medium text-[#202124]">Insights do Gemini</h2>
          </div>
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-8 text-[#5f6368]">
                <RefreshCw size={20} className="animate-spin text-[#4285f4]" />
                <span className="text-sm">Gemini está analisando os dados da loja...</span>
              </div>
            ) : insights.length > 0 ? (
              <>
                {insightsText && (
                  <div className="prose prose-sm max-w-none text-[#3c4043] mb-4">
                    <Markdown>{insightsText}</Markdown>
                  </div>
                )}
                {insights.map((insight, i) => {
                  const colors = insightColors[insight.type] || insightColors.info;
                  return (
                    <div key={i} className={cn('p-4 rounded-lg border', colors.bg, colors.border)}>
                      <h3 className={cn('text-sm font-bold mb-1', colors.title)}>{insight.title}</h3>
                      <p className="text-sm text-[#3c4043]">{insight.description}</p>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="bg-[#e8f0fe] p-4 rounded-lg border border-[#d2e3fc]">
                  <h3 className="text-sm font-bold text-[#1967d2] mb-1">Oportunidade de Venda</h3>
                  <p className="text-sm text-[#3c4043]">
                    "Hoje as vendas de sorvete caíram 40%. A temperatura externa está 5 graus mais fria que ontem. Além disso, a câmera mostra que o totem de exposição de marca na entrada está cobrindo a visão do freezer. Sugiro mover o totem ou focar nas promoções de café quente."
                  </p>
                </div>
                <div className="bg-[#fce8e6] p-4 rounded-lg border border-[#f9d2ce]">
                  <h3 className="text-sm font-bold text-[#d93025] mb-1">Alerta de Fluxo</h3>
                  <p className="text-sm text-[#3c4043]">
                    "Atenção: A fila está com 5 pessoas e o tempo de espera estimado é alto. Considere abrir o segundo caixa para manter o NPS alto."
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <ChartGrid charts={charts} />
    </motion.div>
  );
}

function StatCard({ title, value, change, positive, icon }: {
  title: string,
  value: string,
  change: string,
  positive: boolean,
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white p-5 border border-[#dadce0] rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm text-[#5f6368] font-medium">{title}</span>
        <div className="p-2 bg-[#f1f3f4] rounded-lg">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[#202124]">{value}</span>
        <span className={cn(
          "text-xs font-medium",
          positive ? "text-green-600" : "text-red-600"
        )}>
          {change}
        </span>
      </div>
    </div>
  );
}

// ─── Vision View ──────────────────────────────────────────────

function VisionView({ storeData, refreshStore }: ViewProps) {
  const [activeCamera, setActiveCamera] = useState(0);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cameras = [
    {
      name: 'Frente de Caixa',
      status: 'Online',
      task: 'Conte quantas pessoas estão na fila e estime o tempo de espera.',
      prompt: 'A high-quality CCTV view of a modern coffee shop counter with a line of 5 diverse people waiting to order, cinematic lighting, realistic style'
    },
    {
      name: 'Vitrine de Salgados',
      status: 'Online',
      task: 'Identifique se há ruptura de estoque na vitrine (itens acabando).',
      prompt: 'Close up photo of a glass display case in a bakery with Brazilian cheese bread (pão de queijo) and coxinhas, only 2 cheese breads left, professional food photography'
    },
    {
      name: 'Entrada Principal',
      status: 'Online',
      task: 'Analise o humor e perfil demográfico dos clientes entrando.',
      prompt: 'A diverse young professional man entering a modern coffee shop, smiling, high quality photography, realistic'
    }
  ];

  // Saved images for the active camera
  const savedImagesForCamera = (storeData.generatedImages || []).filter(
    img => img.cameraName === cameras[activeCamera].name
  );

  const handleGenerateImages = async () => {
    setLoading(true);
    setAnalysisResult(null);
    setError(null);
    try {
      const image = await generateVisionExample(cameras[activeCamera].prompt);
      if (!image) {
        setError('Nenhuma imagem foi gerada. Tente novamente.');
        return;
      }

      // Auto-save generated image to disk
      const cameraName = cameras[activeCamera].name;
      await saveGeneratedImage({ cameraName, imageData: image });
      await refreshStore();

      // Set as active image (user can analyze separately)
      setMainImage(image);
    } catch (err) {
      console.error(err);
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const performAnalysis = async (image: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeImage(image, cameras[activeCamera].task);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis failed", err);
      setError(getUserErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setMainImage(base64);
      performAnalysis(base64);

      // Auto-save uploaded image
      try {
        await saveGeneratedImage({ cameraName: cameras[activeCamera].name, imageData: base64 });
        await refreshStore();
      } catch (err) {
        console.error('Failed to save uploaded image:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSavedImage = (img: GeneratedImage) => {
    const imageUrl = `/api/data/images/${img.imageFile}`;
    setMainImage(imageUrl);
    setAnalysisResult(null);
    performAnalysis(imageUrl);
  };

  const handleDeleteSavedImage = async (id: string) => {
    try {
      await deleteEntry('generated-images', id);
      await refreshStore();
      // If the deleted image was the active one, clear it
      const deleted = (storeData.generatedImages || []).find(i => i.id === id);
      if (deleted && mainImage === `/api/data/images/${deleted.imageFile}`) {
        setMainImage(null);
        setAnalysisResult(null);
      }
    } catch (err) {
      console.error('Failed to delete image:', err);
      setError(getUserErrorMessage(err));
    }
  };

  const isServerUrl = mainImage?.startsWith('/api/') ?? false;

  const handleSaveAnalysis = async () => {
    if (!analysisResult || !mainImage) return;

    // If mainImage is a server URL (loaded from history), skip re-saving
    if (isServerUrl) return;

    setSaving(true);
    try {
      await saveVisionAnalysis({
        cameraName: cameras[activeCamera].name,
        imageData: mainImage,
        task: cameras[activeCamera].task,
        result: analysisResult,
      });
      await refreshStore();
    } catch (err) {
      console.error('Failed to save analysis:', err);
      setError(getUserErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSavedAnalysis = (id: string) => {
    const saved = storeData.visionAnalyses.find(a => a.id === id);
    if (!saved) return;

    setAnalysisResult(saved.result);
    if (saved.imageFile) {
      setMainImage(`/api/data/images/${saved.imageFile}`);
    }
  };

  const handleDeleteSavedAnalysis = async (id: string) => {
    try {
      await deleteEntry('vision', id);
      await refreshStore();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError(getUserErrorMessage(err));
    }
  };

  const analysisHistoryItems = storeData.visionAnalyses.map(a => ({
    id: a.id,
    title: a.cameraName,
    subtitle: a.result?.summary ? a.result.summary.slice(0, 40) + '...' : 'Análise salva',
    timestamp: a.timestamp,
    imageUrl: a.imageFile ? `/api/data/images/${a.imageFile}` : undefined,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-normal text-[#202124]">Visão Computacional</h1>
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-[#dadce0] text-[#5f6368] rounded hover:bg-[#f8f9fa] text-sm font-medium"
          >
            <Upload size={16} />
            Upload de Imagem
          </button>
          <button
            onClick={handleGenerateImages}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded hover:shadow-md disabled:opacity-50 text-sm font-medium"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Gerando Imagem..." : "Gerar Imagem com Gemini"}
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Camera List + Saved Images + Analysis History */}
        <div className="lg:col-span-1 space-y-3">
          {cameras.map((cam, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveCamera(idx);
                setAnalysisResult(null);
                setMainImage(null);
              }}
              className={cn(
                "w-full p-4 rounded-lg border text-left transition-all",
                activeCamera === idx
                  ? "bg-[#e8f0fe] border-[#1967d2] shadow-sm"
                  : "bg-white border-[#dadce0] hover:bg-[#f8f9fa]"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{cam.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#34a853] font-bold">Live</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#5f6368]">
                <Camera size={14} />
                <span>{cam.status}</span>
              </div>
            </button>
          ))}

          {/* Saved generated images for this camera */}
          {savedImagesForCamera.length > 0 && (
            <div className="border-t border-[#dadce0] mt-4 pt-4">
              <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ImageIcon size={12} />
                Imagens Salvas ({savedImagesForCamera.length})
              </h3>
              <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto">
                {savedImagesForCamera.map((img) => {
                  const imgUrl = `/api/data/images/${img.imageFile}`;
                  const isActive = mainImage === imgUrl;
                  return (
                    <div key={img.id} className="relative group">
                      <button
                        onClick={() => handleSelectSavedImage(img)}
                        className={cn(
                          "w-full aspect-square rounded overflow-hidden border-2 transition-all",
                          isActive ? "border-[#1a73e8] shadow-md" : "border-transparent hover:border-[#dadce0]"
                        )}
                      >
                        <img
                          src={imgUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                      <button
                        onClick={() => handleDeleteSavedImage(img.id)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded opacity-0 group-hover:opacity-100 text-white hover:bg-red-600 transition-all"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <HistoryPanel
            title="Análises Salvas"
            items={analysisHistoryItems}
            onSelect={handleLoadSavedAnalysis}
            onDelete={handleDeleteSavedAnalysis}
          />
        </div>

        {/* Camera Feed & Analysis */}
        <div className="lg:col-span-3 space-y-4">
          {/* Main Feed */}
          <div className="bg-[#f8f9fa] rounded-lg aspect-video relative overflow-hidden group border border-[#dadce0] flex items-center justify-center">
            {loading || analyzing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/80 z-20">
                <RefreshCw size={48} className="animate-spin mb-4 text-[#4285f4]" />
                <p className="text-lg font-medium">
                  {loading ? "Gemini está criando a imagem..." : "Gemini está analisando a imagem..."}
                </p>
                <p className="text-sm text-gray-400 mt-2">Isso pode levar alguns segundos</p>
              </div>
            ) : null}

            {mainImage ? (
              <>
                <img
                  src={mainImage}
                  alt="Camera Feed"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-500",
                    (loading || analyzing) ? "opacity-20" : "opacity-100"
                  )}
                  referrerPolicy="no-referrer"
                />

                {/* Dynamic AI Overlays */}
                {!analyzing && analysisResult?.objects && (
                  <div className="absolute inset-0 pointer-events-none">
                    {analysisResult.objects.map((obj: any, i: number) => {
                      const [ymin, xmin, ymax, xmax] = obj.box_2d;
                      return (
                        <div
                          key={i}
                          className="absolute border-2 border-[#4285f4] rounded-sm"
                          style={{
                            top: `${ymin / 10}%`,
                            left: `${xmin / 10}%`,
                            width: `${(xmax - xmin) / 10}%`,
                            height: `${(ymax - ymin) / 10}%`
                          }}
                        >
                          <span className="absolute -top-6 left-0 bg-[#4285f4] text-white text-[10px] px-1 rounded whitespace-nowrap">
                            {obj.label} {obj.info ? `(${obj.info})` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-12">
                <div className="w-20 h-20 bg-[#f1f3f4] rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon size={40} className="text-[#dadce0]" />
                </div>
                <h3 className="text-lg font-medium text-[#202124]">
                  {savedImagesForCamera.length > 0 ? 'Selecione uma imagem salva' : 'Nenhuma imagem selecionada'}
                </h3>
                <p className="text-sm text-[#5f6368] max-w-xs mx-auto mt-2">
                  {savedImagesForCamera.length > 0
                    ? 'Escolha uma imagem da galeria à esquerda ou gere novas opções com o Gemini.'
                    : 'Faça o upload de uma imagem ou use o Gemini para gerar uma imagem realista de monitoramento.'
                  }
                </p>
              </div>
            )}

            {mainImage && (
              <div className="absolute bottom-4 left-4 flex gap-2">
                {!analysisResult && !analyzing && (
                  <button
                    onClick={() => performAnalysis(mainImage)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1a73e8]/90 hover:bg-[#1a73e8] rounded text-white text-sm font-medium backdrop-blur-sm"
                  >
                    <Sparkles size={14} />
                    Analisar com Gemini
                  </button>
                )}
                <button className="p-2 bg-black/40 hover:bg-black/60 rounded text-white backdrop-blur-sm">
                  <Maximize2 size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-4 border border-[#dadce0] rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-[#4285f4]" />
                Relatório de Visão Inteligente
              </h3>
              {analysisResult && !analyzing && mainImage && !isServerUrl && (
                <button
                  onClick={handleSaveAnalysis}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1a73e8] hover:bg-[#e8f0fe] rounded transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? 'Salvando...' : 'Salvar Análise'}
                </button>
              )}
            </div>
            <div className="text-sm text-[#5f6368] leading-relaxed">
              {analyzing ? (
                <div className="flex items-center gap-2 italic">
                  <RefreshCw size={14} className="animate-spin" />
                  Gemini está processando os dados visuais...
                </div>
              ) : analysisResult?.summary ? (
                <Markdown>{analysisResult.summary}</Markdown>
              ) : (
                "Selecione ou gere uma imagem para ver a análise da IA em tempo real."
              )}
            </div>
          </div>

          {/* Charts from analysis */}
          {analysisResult?.charts && analysisResult.charts.length > 0 && !analyzing && (
            <ChartGrid charts={analysisResult.charts} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sustainability View ──────────────────────────────────────────────

function SustainabilityView({ storeData, refreshStore }: ViewProps) {
  const [report, setReport] = useState<string>("");
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Load last report on mount
  useEffect(() => {
    if (storeData.sustainabilityReports.length > 0) {
      const last = storeData.sustainabilityReports[0];
      setReport(last.report || '');
      setCharts(last.charts || []);
      setSelectedHistoryId(last.id);
    }
  }, [storeData.sustainabilityReports]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = {
        water: "15% acima da média",
        electricity: "12.4 kWh (Pico às 14h)",
        waste: "Redução de 5% em plásticos"
      };
      const result = await getSustainabilityReport(data);
      setReport(result.text || "");
      setCharts(result.charts || []);

      // Auto-save
      await saveSustainabilityReport({
        inputData: data,
        report: result.text || '',
        charts: result.charts || [],
      });
      await refreshStore();
    } catch (err) {
      console.error(err);
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = (id: string) => {
    const saved = storeData.sustainabilityReports.find(r => r.id === id);
    if (!saved) return;
    setReport(saved.report || '');
    setCharts(saved.charts || []);
    setSelectedHistoryId(id);
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await deleteEntry('sustainability', id);
      await refreshStore();
      if (selectedHistoryId === id) {
        setReport('');
        setCharts([]);
        setSelectedHistoryId(undefined);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      setError(getUserErrorMessage(err));
    }
  };

  const historyItems = storeData.sustainabilityReports.map(r => ({
    id: r.id,
    title: 'Relatório de Sustentabilidade',
    subtitle: r.report ? r.report.slice(0, 50) + '...' : 'Relatório salvo',
    timestamp: r.timestamp,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-normal text-[#202124]">Gestão de Recursos & Sustentabilidade</h1>
        <button
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded hover:shadow-md disabled:opacity-50"
        >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <SparklesIcon size={18} />}
          {loading ? "Analisando..." : "Gerar Resumo do Dia"}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: resource gauges + history */}
        <div className="space-y-6">
          <div className="bg-white p-6 border border-[#dadce0] rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium flex items-center gap-2">
                <Droplets size={20} className="text-blue-500" />
                Consumo de Água (Pia Principal)
              </h3>
              <span className="text-xs text-red-500 font-bold">+15% vs média</span>
            </div>
            <div className="h-4 bg-[#f1f3f4] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-blue-500 w-[75%]"></div>
            </div>
            <div className="flex justify-between text-xs text-[#5f6368]">
              <span>0L</span>
              <span>Meta: 150L</span>
              <span>Atual: 185L</span>
            </div>
          </div>

          <div className="bg-white p-6 border border-[#dadce0] rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-medium flex items-center gap-2">
                <Zap size={20} className="text-yellow-500" />
                Consumo de Energia
              </h3>
              <span className="text-xs text-green-500 font-bold">-2% vs média</span>
            </div>
            <div className="h-4 bg-[#f1f3f4] rounded-full overflow-hidden mb-2">
              <div className="h-full bg-yellow-500 w-[60%]"></div>
            </div>
            <div className="flex justify-between text-xs text-[#5f6368]">
              <span>0 kWh</span>
              <span>Meta: 15 kWh</span>
              <span>Atual: 12.4 kWh</span>
            </div>
          </div>

          <HistoryPanel
            title="Relatórios Anteriores"
            items={historyItems}
            selectedId={selectedHistoryId}
            onSelect={handleLoadSaved}
            onDelete={handleDeleteSaved}
          />
        </div>

        {/* Right column: report + charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center gap-2">
              <SparklesIcon size={18} className="text-[#4285f4]" />
              <h2 className="font-medium text-[#202124]">Relatório Narrado pelo Gemini</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-12 text-[#5f6368]">
                  <RefreshCw size={20} className="animate-spin text-[#4285f4]" />
                  <span className="text-sm">Gemini está analisando os dados de sustentabilidade...</span>
                </div>
              ) : report ? (
                <div className="prose prose-sm max-w-none text-[#3c4043]">
                  <Markdown>{report}</Markdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#5f6368] space-y-4 py-12">
                  <div className="p-4 bg-[#f1f3f4] rounded-full">
                    <Leaf size={48} className="text-[#dadce0]" />
                  </div>
                  <p className="max-w-xs">Clique em "Gerar Resumo do Dia" para que a IA analise os dados de consumo e gere recomendações.</p>
                </div>
              )}
            </div>
          </div>

          <ChartGrid charts={charts} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Chat View ──────────────────────────────────────────────

function ChatView({ storeData, refreshStore }: ViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente operacional da CloudCoffee. Posso ajudar com:\n\n- **Rascunhos de e-mail** para fornecedores, equipe ou matriz\n- **Listas e checklists** de tarefas, compras ou abertura/fechamento\n- **Planos operacionais** para eventos, promoções ou melhorias\n- **Análise de dados** com gráficos de vendas, estoque e fluxo\n- **Comunicados** para a equipe\n- **Briefing do turno** com resumo do dia\n\nComo posso ajudar na operação hoje?' }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(`chat_${Date.now()}`);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    const userMessage: ChatMessage = { role: 'user', content: userMsg, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const context = {
        vendas: "R$ 4.250,00 hoje (meta: R$ 5.000)",
        ticketMedio: "R$ 18,50",
        clientes: "142 atendidos, 5 na fila agora",
        clima: "18°C, nublado, previsão de chuva à tarde",
        estoque: { paoDeQueijo: "2 unidades (crítico)", café: "5kg", leite: "12L", açaí: "3kg" },
        equipe: "3 baristas, 1 caixa, 1 gerente no turno",
        horarioPico: "11h30-13h30",
        fornecedores: { padaria: "Padaria São José", café: "Café Especial Ltda", descartáveis: "EcoPack" },
        consumo: { energia: "12.4 kWh (meta: 15 kWh)", agua: "185L (meta: 150L)" },
        ultimaReposicao: "Ontem às 14h",
        promocaoAtiva: "Combo café + pão de queijo R$ 12,90"
      };
      const result = await getStoreInsights(userMsg, context);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.text || "Desculpe, tive um problema ao processar sua solicitação.",
        charts: result.charts || [],
        timestamp: new Date().toISOString(),
      };
      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Auto-save session
      await saveChatSession({ id: sessionId, messages: updatedMessages });
      refreshStore();
    } catch (err) {
      console.error(err);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: getUserErrorMessage(err),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    const newId = `chat_${Date.now()}`;
    setSessionId(newId);
    setSelectedSessionId(undefined);
    setMessages([
      { role: 'assistant', content: 'Olá! Sou o assistente operacional da CloudCoffee. Posso ajudar com:\n\n- **Rascunhos de e-mail** para fornecedores, equipe ou matriz\n- **Listas e checklists** de tarefas, compras ou abertura/fechamento\n- **Planos operacionais** para eventos, promoções ou melhorias\n- **Análise de dados** com gráficos de vendas, estoque e fluxo\n- **Comunicados** para a equipe\n- **Briefing do turno** com resumo do dia\n\nComo posso ajudar na operação hoje?' }
    ]);
  };

  const handleLoadSession = (id: string) => {
    const session = storeData.chatSessions.find(s => s.id === id);
    if (!session) return;
    setSessionId(session.id);
    setSelectedSessionId(session.id);
    setMessages(session.messages);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteEntry('chat', id);
      await refreshStore();
      if (sessionId === id) {
        handleNewConversation();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const sessionItems = storeData.chatSessions.map(s => ({
    id: s.id,
    title: s.messages.find(m => m.role === 'user')?.content?.slice(0, 40) || 'Conversa',
    subtitle: `${s.messages.length} mensagens`,
    timestamp: s.lastMessageAt,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="h-full flex gap-4"
    >
      {/* Session sidebar */}
      {storeData.chatSessions.length > 0 && (
        <div className="w-64 flex-shrink-0 bg-white border border-[#dadce0] rounded-lg p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">Conversas</h3>
            <button
              onClick={handleNewConversation}
              className="p-1.5 hover:bg-[#e8f0fe] rounded text-[#1a73e8] transition-colors"
              title="Nova Conversa"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1.5">
            {sessionItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleLoadSession(item.id)}
                className={cn(
                  "p-2.5 rounded-lg border text-left cursor-pointer transition-all group",
                  selectedSessionId === item.id
                    ? "bg-[#e8f0fe] border-[#1967d2]"
                    : "bg-white border-[#e8eaed] hover:bg-[#f8f9fa]"
                )}
              >
                <p className="text-xs font-medium text-[#202124] truncate">{item.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-[#5f6368]">{item.subtitle}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(item.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-all"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white border border-[#dadce0] rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4285f4] to-[#34a853] rounded-full flex items-center justify-center text-white">
              <SparklesIcon size={20} />
            </div>
            <div>
              <h2 className="font-medium text-[#202124]">Fale com a sua Loja</h2>
              <p className="text-xs text-[#5f6368]">Gemini Corporate Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1a73e8] hover:bg-[#e8f0fe] rounded transition-colors"
            >
              <Plus size={14} />
              Nova Conversa
            </button>
            <div className="flex items-center gap-2 text-xs text-[#34a853]">
              <div className="w-2 h-2 bg-[#34a853] rounded-full animate-pulse"></div>
              Conectado
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8f9fa]">
          {messages.map((msg, idx) => (
            <div key={idx}>
              <div className={cn(
                "flex",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  msg.role === 'user'
                    ? "bg-[#1a73e8] text-white rounded-tr-none"
                    : "bg-white text-[#3c4043] border border-[#dadce0] rounded-tl-none"
                )}>
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
              {/* Inline charts for assistant messages */}
              {msg.role === 'assistant' && msg.charts && msg.charts.length > 0 && (
                <div className="mt-3 ml-0 max-w-[80%]">
                  <ChartGrid charts={msg.charts} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#dadce0] rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[#dadce0] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[#dadce0] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#dadce0] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#dadce0] bg-white">
          <div className="flex items-center gap-2 bg-[#f1f3f4] rounded-full px-4 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4285f4] transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ex: Escreva um e-mail para o fornecedor, monte o checklist de abertura..."
              className="flex-1 bg-transparent border-none outline-none text-sm py-1"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-2 bg-[#1a73e8] text-white rounded-full hover:shadow-md disabled:opacity-50 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-center text-[#70757a] mt-2">
            O Gemini pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Briefing View ──────────────────────────────────────────────

function BriefingView({ storeData, refreshStore }: ViewProps) {
  const [loading, setLoading] = useState(false);
  const [briefingText, setBriefingText] = useState('');
  const [actionItems, setActionItems] = useState<BriefingActionItem[]>([]);
  const [weatherSummary, setWeatherSummary] = useState('');
  const [revenueTarget, setRevenueTarget] = useState('');
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Load last briefing on mount
  useEffect(() => {
    if (storeData.dailyBriefings.length > 0) {
      const last = storeData.dailyBriefings[0];
      setBriefingText(last.text || '');
      setActionItems(last.actionItems || []);
      setWeatherSummary(last.weatherSummary || '');
      setRevenueTarget(last.revenueTarget || '');
      setCharts(last.charts || []);
      setSelectedHistoryId(last.id);
    }
  }, [storeData.dailyBriefings]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const context = {
        data: new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        clima: '22°C, parcialmente nublado, previsão de chuva leve à tarde',
        vendasOntem: { total: 'R$ 4.850,00', meta: 'R$ 5.000,00', atingimento: '97%' },
        estoque: [
          { item: 'Pão de Queijo', quantidade: 8, status: 'baixo' },
          { item: 'Café Especial (kg)', quantidade: 2, status: 'critico' },
          { item: 'Leite (L)', quantidade: 15, status: 'ok' },
          { item: 'Açaí (kg)', quantidade: 1, status: 'critico' },
          { item: 'Copos descartáveis', quantidade: 200, status: 'ok' },
          { item: 'Açúcar (kg)', quantidade: 3, status: 'baixo' },
        ],
        equipe: {
          manha: ['Ana (barista)', 'Carlos (caixa)', 'Maria (atendimento)'],
          tarde: ['João (barista)', 'Pedro (caixa)'],
          ausencias: ['Fernanda (atestado médico)'],
        },
        horariosPico: ['07:30-09:00', '11:30-13:30', '15:00-16:30'],
        promocaoAtiva: 'Combo café + pão de queijo R$ 12,90',
        manutencao: 'Máquina de espresso #2 precisa de descalcificação',
        metaReceita: 'R$ 5.200,00',
      };

      const result = await getDailyBriefing(context);
      setBriefingText(result.text || '');
      setActionItems(result.actionItems || []);
      setWeatherSummary(result.weatherSummary || '');
      setRevenueTarget(result.revenueTarget || '');
      setCharts(result.charts || []);

      // Auto-save
      await saveDailyBriefing({
        text: result.text || '',
        actionItems: result.actionItems || [],
        weatherSummary: result.weatherSummary || '',
        revenueTarget: result.revenueTarget || '',
        charts: result.charts || [],
      });
      await refreshStore();
    } catch (err) {
      console.error(err);
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = (id: string) => {
    const saved = storeData.dailyBriefings.find(b => b.id === id);
    if (!saved) return;
    setBriefingText(saved.text || '');
    setActionItems(saved.actionItems || []);
    setWeatherSummary(saved.weatherSummary || '');
    setRevenueTarget(saved.revenueTarget || '');
    setCharts(saved.charts || []);
    setSelectedHistoryId(id);
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await deleteEntry('briefing', id);
      await refreshStore();
      if (selectedHistoryId === id) {
        setBriefingText('');
        setActionItems([]);
        setWeatherSummary('');
        setRevenueTarget('');
        setCharts([]);
        setSelectedHistoryId(undefined);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      setError(getUserErrorMessage(err));
    }
  };

  const historyItems = storeData.dailyBriefings.map(b => ({
    id: b.id,
    title: 'Briefing do Dia',
    subtitle: b.text ? b.text.slice(0, 50) + '...' : 'Briefing salvo',
    timestamp: b.timestamp,
  }));

  const priorityColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    urgente: { bg: 'bg-red-50', border: 'border-l-red-500', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
    importante: { bg: 'bg-orange-50', border: 'border-l-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
    rotina: { bg: 'bg-blue-50', border: 'border-l-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-normal text-[#202124]">Briefing do Dia</h1>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded hover:shadow-md disabled:opacity-50 text-sm font-medium"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sunrise size={16} />}
          {loading ? 'Gerando Briefing...' : 'Gerar Briefing'}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          {/* Weather card */}
          <div className="bg-white p-4 border border-[#dadce0] rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sunrise size={18} className="text-orange-400" />
              <h3 className="font-medium text-sm text-[#202124]">Clima & Operação</h3>
            </div>
            <p className="text-sm text-[#5f6368]">
              {weatherSummary || '22°C, parcialmente nublado. Gere o briefing para ver o impacto na operação.'}
            </p>
          </div>

          {/* Revenue card */}
          <div className="bg-white p-4 border border-[#dadce0] rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-green-600" />
              <h3 className="font-medium text-sm text-[#202124]">Meta de Receita</h3>
            </div>
            <p className="text-2xl font-bold text-[#202124]">{revenueTarget || 'R$ 5.200,00'}</p>
            <p className="text-xs text-[#5f6368] mt-1">Ontem: R$ 4.850,00 (97% da meta)</p>
          </div>

          {/* Action Items */}
          {actionItems.length > 0 && (
            <div className="bg-white border border-[#dadce0] rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa]">
                <h3 className="font-medium text-sm text-[#202124]">Itens de Ação ({actionItems.length})</h3>
              </div>
              <div className="divide-y divide-[#f1f3f4] max-h-[400px] overflow-y-auto">
                {actionItems.map((item, i) => {
                  const colors = priorityColors[item.priority] || priorityColors.rotina;
                  return (
                    <div key={i} className={cn('p-3 border-l-4', colors.bg, colors.border)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', colors.badge)}>
                          {item.priority}
                        </span>
                        <span className="text-[10px] text-[#5f6368] uppercase tracking-wider">{item.category}</span>
                      </div>
                      <p className="text-sm text-[#3c4043]">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <HistoryPanel
            title="Briefings Anteriores"
            items={historyItems}
            selectedId={selectedHistoryId}
            onSelect={handleLoadSaved}
            onDelete={handleDeleteSaved}
          />
        </div>

        {/* Right column: report + charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center gap-2">
              <SparklesIcon size={18} className="text-[#4285f4]" />
              <h2 className="font-medium text-[#202124]">Briefing Gerado pelo Gemini</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-12 text-[#5f6368]">
                  <RefreshCw size={20} className="animate-spin text-[#4285f4]" />
                  <span className="text-sm">Gemini está preparando o briefing matinal...</span>
                </div>
              ) : briefingText ? (
                <div className="prose prose-sm max-w-none text-[#3c4043]">
                  <Markdown>{briefingText}</Markdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#5f6368] space-y-4 py-12">
                  <div className="p-4 bg-[#f1f3f4] rounded-full">
                    <Sunrise size={48} className="text-[#dadce0]" />
                  </div>
                  <p className="max-w-xs">Clique em "Gerar Briefing" para que a IA prepare o resumo operacional do dia com ações prioritárias.</p>
                </div>
              )}
            </div>
          </div>

          <ChartGrid charts={charts} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Feedback View ──────────────────────────────────────────────

const mockReviews: FeedbackReview[] = [
  { id: 'r1', author: 'Maria S.', rating: 5, text: 'Melhor café da cidade! O atendimento é sempre impecável e o ambiente é super aconchegante. Volto sempre!', date: '2025-01-15' },
  { id: 'r2', author: 'João P.', rating: 4, text: 'Café muito bom e pão de queijo delicioso. Só acho que o preço poderia ser um pouco mais acessível.', date: '2025-01-14' },
  { id: 'r3', author: 'Ana L.', rating: 2, text: 'Esperei 20 minutos na fila para ser atendida. O café até é bom, mas o tempo de espera é inaceitável.', date: '2025-01-13' },
  { id: 'r4', author: 'Carlos R.', rating: 5, text: 'Ambiente perfeito para trabalhar! WiFi rápido, tomadas em todas as mesas e o café espresso é sensacional.', date: '2025-01-12' },
  { id: 'r5', author: 'Fernanda M.', rating: 3, text: 'O café é ok, nada excepcional. O ambiente é bonito mas as cadeiras são desconfortáveis para ficar muito tempo.', date: '2025-01-11' },
  { id: 'r6', author: 'Ricardo T.', rating: 1, text: 'Péssimo atendimento. O barista foi grosseiro e errou meu pedido duas vezes. Não volto mais.', date: '2025-01-10' },
  { id: 'r7', author: 'Patrícia G.', rating: 4, text: 'Adoro o combo café + pão de queijo! Ótimo custo-benefício. A equipe da manhã é sempre muito simpática.', date: '2025-01-09' },
  { id: 'r8', author: 'Lucas B.', rating: 5, text: 'Cafeteria com conceito sustentável incrível! Os copos biodegradáveis e a decoração com plantas são um diferencial.', date: '2025-01-08' },
  { id: 'r9', author: 'Camila F.', rating: 3, text: 'O café gelado é bom mas achei caro demais. R$ 18 por um copo médio é puxado. O espaço é bonito pelo menos.', date: '2025-01-07' },
  { id: 'r10', author: 'Roberto A.', rating: 4, text: 'Boa variedade de opções no cardápio. O açaí bowl é excelente! Só falta mais opções de comida salgada.', date: '2025-01-06' },
];

function FeedbackView({ storeData, refreshStore }: ViewProps) {
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [sentimentSummary, setSentimentSummary] = useState<FeedbackSentiment | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<FeedbackCategory[]>([]);
  const [improvementPlan, setImprovementPlan] = useState<FeedbackImprovement[]>([]);
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Load last analysis on mount
  useEffect(() => {
    if (storeData.feedbackAnalyses.length > 0) {
      const last = storeData.feedbackAnalyses[0];
      setAnalysisText(last.text || '');
      setSentimentSummary(last.sentimentSummary || null);
      setCategoryBreakdown(last.categoryBreakdown || []);
      setImprovementPlan(last.improvementPlan || []);
      setCharts(last.charts || []);
      setSelectedHistoryId(last.id);
    }
  }, [storeData.feedbackAnalyses]);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeFeedback(mockReviews);
      setAnalysisText(result.text || '');
      setSentimentSummary(result.sentimentSummary || null);
      setCategoryBreakdown(result.categoryBreakdown || []);
      setImprovementPlan(result.improvementPlan || []);
      setCharts(result.charts || []);

      // Auto-save
      await saveFeedbackAnalysis({
        reviewCount: mockReviews.length,
        text: result.text || '',
        sentimentSummary: result.sentimentSummary || { positive: 0, neutral: 0, negative: 0, averageRating: 0 },
        categoryBreakdown: result.categoryBreakdown || [],
        improvementPlan: result.improvementPlan || [],
        charts: result.charts || [],
      });
      await refreshStore();
    } catch (err) {
      console.error(err);
      setError(getUserErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSaved = (id: string) => {
    const saved = storeData.feedbackAnalyses.find(a => a.id === id);
    if (!saved) return;
    setAnalysisText(saved.text || '');
    setSentimentSummary(saved.sentimentSummary || null);
    setCategoryBreakdown(saved.categoryBreakdown || []);
    setImprovementPlan(saved.improvementPlan || []);
    setCharts(saved.charts || []);
    setSelectedHistoryId(id);
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await deleteEntry('feedback', id);
      await refreshStore();
      if (selectedHistoryId === id) {
        setAnalysisText('');
        setSentimentSummary(null);
        setCategoryBreakdown([]);
        setImprovementPlan([]);
        setCharts([]);
        setSelectedHistoryId(undefined);
      }
    } catch (err) {
      console.error('Failed to delete:', err);
      setError(getUserErrorMessage(err));
    }
  };

  const historyItems = storeData.feedbackAnalyses.map(a => ({
    id: a.id,
    title: `Análise de ${a.reviewCount || '?'} avaliações`,
    subtitle: a.text ? a.text.slice(0, 50) + '...' : 'Análise salva',
    timestamp: a.timestamp,
  }));

  const ratingColor = (rating: number) => {
    if (rating >= 4) return 'border-l-green-500';
    if (rating === 3) return 'border-l-yellow-500';
    return 'border-l-red-500';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} className={i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
    ));
  };

  const priorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'Alta': 'bg-red-100 text-red-700',
      'Média': 'bg-orange-100 text-orange-700',
      'Baixa': 'bg-blue-100 text-blue-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-normal text-[#202124]">Voz do Cliente</h1>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded hover:shadow-md disabled:opacity-50 text-sm font-medium"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Star size={16} />}
          {loading ? 'Analisando...' : 'Analisar Feedback'}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: review cards + history */}
        <div className="space-y-4">
          <div className="bg-white border border-[#dadce0] rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa]">
              <h3 className="font-medium text-sm text-[#202124]">Avaliações do Google ({mockReviews.length})</h3>
            </div>
            <div className="divide-y divide-[#f1f3f4] max-h-[500px] overflow-y-auto">
              {mockReviews.map(review => (
                <div key={review.id} className={cn('p-3 border-l-4', ratingColor(review.rating))}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#202124]">{review.author}</span>
                    <span className="text-[10px] text-[#5f6368]">{review.date}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-xs text-[#5f6368] leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          </div>

          <HistoryPanel
            title="Análises Anteriores"
            items={historyItems}
            selectedId={selectedHistoryId}
            onSelect={handleLoadSaved}
            onDelete={handleDeleteSaved}
          />
        </div>

        {/* Right column: analysis results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sentiment summary */}
          {sentimentSummary && (
            <div className="bg-white border border-[#dadce0] rounded-lg shadow-sm p-4">
              <h3 className="font-medium text-sm text-[#202124] mb-3">Resumo de Sentimento</h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{sentimentSummary.positive}%</p>
                  <p className="text-xs text-green-700 font-medium">Positivo</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{sentimentSummary.neutral}%</p>
                  <p className="text-xs text-gray-700 font-medium">Neutro</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{sentimentSummary.negative}%</p>
                  <p className="text-xs text-red-700 font-medium">Negativo</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-2xl font-bold text-yellow-600">{sentimentSummary.averageRating}</p>
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  </div>
                  <p className="text-xs text-yellow-700 font-medium">Nota Média</p>
                </div>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white border border-[#dadce0] rounded-lg shadow-sm p-4">
              <h3 className="font-medium text-sm text-[#202124] mb-3">Categorias de Feedback</h3>
              <div className="grid grid-cols-2 gap-2">
                {categoryBreakdown.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[#f8f9fa] rounded">
                    <div>
                      <p className="text-sm font-medium text-[#202124]">{cat.category}</p>
                      <p className="text-[10px] text-[#5f6368]">{cat.sentiment}</p>
                    </div>
                    <span className="text-xs font-bold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded">{cat.mentions} menções</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvement plan */}
          {improvementPlan.length > 0 && (
            <div className="bg-white border border-[#dadce0] rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa]">
                <h3 className="font-medium text-sm text-[#202124]">Plano de Melhoria</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#dadce0]">
                      <th className="text-left px-4 py-2 text-xs font-medium text-[#5f6368] uppercase">Área</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-[#5f6368] uppercase">Ação</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-[#5f6368] uppercase">Prioridade</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-[#5f6368] uppercase">Impacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f3f4]">
                    {improvementPlan.map((item, i) => (
                      <tr key={i} className="hover:bg-[#f8f9fa]">
                        <td className="px-4 py-2 font-medium text-[#202124]">{item.area}</td>
                        <td className="px-4 py-2 text-[#3c4043]">{item.action}</td>
                        <td className="px-4 py-2">
                          <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', priorityBadge(item.priority))}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[#5f6368]">{item.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Markdown report */}
          <div className="bg-white border border-[#dadce0] rounded-lg overflow-hidden shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-[#dadce0] bg-[#f8f9fa] flex items-center gap-2">
              <SparklesIcon size={18} className="text-[#4285f4]" />
              <h2 className="font-medium text-[#202124]">Análise Detalhada pelo Gemini</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-12 text-[#5f6368]">
                  <RefreshCw size={20} className="animate-spin text-[#4285f4]" />
                  <span className="text-sm">Gemini está analisando as avaliações dos clientes...</span>
                </div>
              ) : analysisText ? (
                <div className="prose prose-sm max-w-none text-[#3c4043]">
                  <Markdown>{analysisText}</Markdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#5f6368] space-y-4 py-12">
                  <div className="p-4 bg-[#f1f3f4] rounded-full">
                    <Star size={48} className="text-[#dadce0]" />
                  </div>
                  <p className="max-w-xs">Clique em "Analisar Feedback" para que a IA analise as avaliações dos clientes e gere um plano de melhoria.</p>
                </div>
              )}
            </div>
          </div>

          <ChartGrid charts={charts} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────

function SparklesIcon({ size = 24, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
