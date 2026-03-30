import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Recycle, 
  Leaf, 
  BarChart3, 
  ArrowRight, 
  X, 
  RefreshCcw, 
  Info,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  History,
  Calendar,
  MessageSquare,
  Send,
  MapPin,
  ExternalLink,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { analyzeWasteItem } from './services/geminiService';
import { cn } from './lib/utils';

// Data from "What a Waste 3.0" report
const globalWasteData = [
  { year: '2022', amount: 2.56, fill: '#10b981' },
  { year: '2030 (Proj)', amount: 2.95, fill: '#34d399' },
  { year: '2040 (Proj)', amount: 3.42, fill: '#6ee7b7' },
  { year: '2050 (Proj)', amount: 3.86, fill: '#a7f3d0' },
];

const wasteComposition = [
  { name: 'Food/Organic', value: 38, fill: '#059669' },
  { name: 'Paper/Cardboard', value: 17, fill: '#10b981' },
  { name: 'Plastic', value: 12, fill: '#34d399' },
  { name: 'Glass', value: 5, fill: '#6ee7b7' },
  { name: 'Metal', value: 4, fill: '#a7f3d0' },
  { name: 'Other', value: 24, fill: '#ecfdf5' },
];

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'scanner' | 'impact' | 'circularity' | 'history'>('scanner');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'incorrect' | 'improvement'>('incorrect');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('ecosphere_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ecosphere_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setIsScanning(true);
    setAnalysis(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access denied. Please enable camera permissions.");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
        handleAnalyze(imageData);
      }
    }
  };

  const handleAnalyze = async (image: string) => {
    setIsLoading(true);
    try {
      const result = await analyzeWasteItem(image, userLocation || undefined);
      setAnalysis(result);
      
      // Save to history
      const historyItem = {
        id: Date.now(),
        itemName: result.itemName,
        category: result.category,
        circularityScore: result.circularityScore,
        date: new Date().toISOString(),
        image: image,
        nearbyLocations: result.nearbyLocations,
        detailedLocations: result.detailedLocations,
        nearbyRecyclingAdvice: result.nearbyRecyclingAdvice,
        environmentalImpact: result.environmentalImpact,
        circularActions: result.circularActions,
        sortingGuide: result.sortingGuide
      };
      setHistory(prev => [historyItem, ...prev]);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHistoryItem = (id: number) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Feedback submitted:", { type: feedbackType, text: feedbackText });
    
    setIsSubmittingFeedback(false);
    setFeedbackSubmitted(true);
    setFeedbackText('');
    
    setTimeout(() => {
      setShowFeedback(false);
      setFeedbackSubmitted(false);
    }, 2000);
  };

  const handleShare = async () => {
    if (!analysis) return;

    const shareData = {
      title: `EcoSphere: I just analyzed a ${analysis.itemName}!`,
      text: `I used EcoSphere to find circular actions for my ${analysis.itemName}. It has a circularity score of ${analysis.circularityScore}/10! Check out how you can reduce waste too.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback: Open email
      const subject = encodeURIComponent(shareData.title);
      const body = encodeURIComponent(`${shareData.text}\n\nCheck it out here: ${shareData.url}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <RefreshCcw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-900">EcoSphere</h1>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-emerald-600/70">Circular Intelligence</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('scanner')}
            className={cn("text-sm font-medium transition-colors", activeTab === 'scanner' ? "text-emerald-600" : "text-gray-500 hover:text-emerald-500")}
          >
            Scanner
          </button>
          <button 
            onClick={() => setActiveTab('impact')}
            className={cn("text-sm font-medium transition-colors", activeTab === 'impact' ? "text-emerald-600" : "text-gray-500 hover:text-emerald-500")}
          >
            Global Impact
          </button>
          <button 
            onClick={() => setActiveTab('circularity')}
            className={cn("text-sm font-medium transition-colors", activeTab === 'circularity' ? "text-emerald-600" : "text-gray-500 hover:text-emerald-500")}
          >
            Circularity Hub
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn("text-sm font-medium transition-colors", activeTab === 'history' ? "text-emerald-600" : "text-gray-500 hover:text-emerald-500")}
          >
            History
          </button>
          <button 
            onClick={() => setShowFeedback(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Feedback
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'scanner' && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Hero Section */}
              <section className="text-center space-y-4 py-8">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-gray-900 leading-tight">
                  Turn Waste into <span className="gradient-text">Value</span>.
                </h2>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                  Use AI to identify circular pathways for your items. Inspired by the World Bank's 2050 vision for a waste-free world.
                </p>
              </section>

              {/* Scanner Interface */}
              <div className="relative max-w-2xl mx-auto aspect-video rounded-3xl overflow-hidden bg-gray-900 shadow-2xl group">
                {!isScanning && !capturedImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8 space-y-6">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 animate-pulse">
                      <Camera className="w-10 h-10 text-emerald-400" />
                    </div>
                    <button 
                      onClick={startCamera}
                      className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-900/20"
                    >
                      Start AI Scanner
                    </button>
                  </div>
                )}

                {isScanning && (
                  <div className="absolute inset-0">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-[2px] border-emerald-500/50 m-8 rounded-2xl pointer-events-none">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                      <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.5)]"
                      />
                    </div>
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                      <button 
                        onClick={captureImage}
                        className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-emerald-500/20 hover:scale-110 transition-transform"
                      >
                        <div className="w-12 h-12 bg-emerald-600 rounded-full" />
                      </button>
                      <button 
                        onClick={stopCamera}
                        className="w-16 h-16 bg-red-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500/40 transition-colors"
                      >
                        <X className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                )}

                {capturedImage && (
                  <div className="absolute inset-0">
                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4">
                        <RefreshCcw className="w-12 h-12 animate-spin text-emerald-400" />
                        <p className="font-bold tracking-widest uppercase text-xs">Analyzing Circularity...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Analysis Results */}
              <AnimatePresence>
                {analysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  >
                    <div className="md:col-span-2 space-y-6">
                      <div className="glass-card rounded-3xl p-8 space-y-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                              {analysis.category}
                            </span>
                            <h3 className="text-3xl font-bold mt-2 text-gray-900">{analysis.itemName}</h3>
                          </div>
                          <div className="flex items-start gap-4">
                            <button 
                              onClick={handleShare}
                              className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors shadow-sm"
                              title="Share findings"
                            >
                              <Share2 className="w-5 h-5" />
                            </button>
                            <div className="text-right">
                              <div className="text-4xl font-black text-emerald-600">{analysis.circularityScore}/10</div>
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Circularity Score</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="flex items-center gap-2 font-bold text-gray-700">
                            <RefreshCcw className="w-4 h-4 text-emerald-500" />
                            Circular Actions
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {analysis.circularActions.map((action: string, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                <span className="text-sm font-medium text-emerald-900">{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 space-y-2">
                          <h4 className="flex items-center gap-2 font-bold text-amber-700 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            Environmental Impact
                          </h4>
                          <p className="text-sm text-amber-900/80 leading-relaxed">
                            {analysis.environmentalImpact}
                          </p>
                        </div>

                        {analysis.detailedLocations && analysis.detailedLocations.length > 0 && (
                          <div className="space-y-4">
                            <h4 className="flex items-center gap-2 font-bold text-gray-700">
                              <MapPin className="w-4 h-4 text-emerald-500" />
                              Recycle Nearby
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                              {analysis.detailedLocations.map((loc: any, i: number) => {
                                // Try to find the matching URI from grounding
                                const groundingLoc = analysis.nearbyLocations?.find((g: any) => 
                                  g.title.toLowerCase().includes(loc.name.toLowerCase()) || 
                                  loc.name.toLowerCase().includes(g.title.toLowerCase())
                                ) || analysis.nearbyLocations?.[i];

                                return (
                                  <div 
                                    key={i} 
                                    className="glass-card rounded-2xl p-6 space-y-4 border border-gray-100 hover:border-emerald-200 transition-all group"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                          <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <h5 className="font-bold text-gray-900 leading-tight">{loc.name}</h5>
                                          <p className="text-xs text-gray-400 mt-1">{loc.address}</p>
                                        </div>
                                      </div>
                                      {groundingLoc?.uri && (
                                        <a 
                                          href={groundingLoc.uri} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                      {loc.hours && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hours</span>
                                          <p className="text-xs text-gray-600 font-medium">{loc.hours}</p>
                                        </div>
                                      )}
                                      {loc.contact && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact</span>
                                          <p className="text-xs text-gray-600 font-medium">{loc.contact}</p>
                                        </div>
                                      )}
                                    </div>

                                    {loc.acceptedMaterials && loc.acceptedMaterials.length > 0 && (
                                      <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Accepted Materials</span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {loc.acceptedMaterials.map((mat: string, j: number) => (
                                            <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-medium">
                                              {mat}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {analysis.nearbyRecyclingAdvice && (
                              <p className="text-xs text-gray-500 italic px-2">
                                {analysis.nearbyRecyclingAdvice}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="glass-card rounded-3xl p-8 space-y-4">
                        <h4 className="flex items-center gap-2 font-bold text-gray-700">
                          <Trash2 className="w-4 h-4 text-gray-400" />
                          Sorting Guide
                        </h4>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {analysis.sortingGuide}
                        </p>
                        <button 
                          onClick={() => { setAnalysis(null); setCapturedImage(null); }}
                          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors mt-4"
                        >
                          Scan Another Item
                        </button>
                      </div>
                      
                      <div className="bg-emerald-600 rounded-3xl p-8 text-white space-y-4 shadow-xl shadow-emerald-200">
                        <Info className="w-8 h-8 opacity-50" />
                        <h4 className="font-bold text-xl">Did you know?</h4>
                        <p className="text-sm text-emerald-100 leading-relaxed">
                          Global waste is projected to reach 3.86 billion tonnes by 2050. Your small actions today contribute to a circular future.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'impact' && (
            <motion.div 
              key="impact"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 py-8"
            >
              <section className="text-center space-y-4">
                <h2 className="text-4xl font-bold tracking-tight text-gray-900">The Global Waste Crisis</h2>
                <p className="text-gray-500 max-w-2xl mx-auto">
                  Visualizing data from the "What a Waste 3.0" report. The trajectory is clear: we must transition to circularity.
                </p>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card rounded-3xl p-8 space-y-6">
                  <h3 className="text-xl font-bold text-gray-800">Waste Generation Projections</h3>
                  <p className="text-sm text-gray-500">Billion tonnes of municipal solid waste per year</p>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={globalWasteData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                          {globalWasteData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                      <strong>Insight:</strong> Global waste is rising faster than previously projected. 2.56 billion tonnes were already produced by 2022.
                    </p>
                  </div>
                </div>

                <div className="glass-card rounded-3xl p-8 space-y-6">
                  <h3 className="text-xl font-bold text-gray-800">Global Waste Composition</h3>
                  <p className="text-sm text-gray-500">Percentage of total waste by material type</p>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={wasteComposition}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {wasteComposition.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {wasteComposition.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                        {item.name}: {item.value}%
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'circularity' && (
            <motion.div 
              key="circularity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 py-8"
            >
              <section className="text-center space-y-4">
                <h2 className="text-4xl font-bold tracking-tight text-gray-900">Circularity Hub</h2>
                <p className="text-gray-500 max-w-2xl mx-auto">
                  Strategies to move from a linear "take-make-waste" model to a circular economy.
                </p>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Design for Longevity",
                    desc: "Support products designed to last, be repaired, and eventually recycled.",
                    icon: <RefreshCcw className="w-6 h-6" />,
                    color: "bg-blue-500"
                  },
                  {
                    title: "Resource Recovery",
                    desc: "Extract maximum value from items before they leave the loop.",
                    icon: <Recycle className="w-6 h-6" />,
                    color: "bg-emerald-500"
                  },
                  {
                    title: "Organic Circularity",
                    desc: "Compost food waste to return nutrients to the soil, reducing methane.",
                    icon: <Leaf className="w-6 h-6" />,
                    color: "bg-amber-500"
                  }
                ].map((card, i) => (
                  <div key={i} className="glass-card rounded-3xl p-8 space-y-4 hover:translate-y-[-4px] transition-transform cursor-pointer">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", card.color)}>
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{card.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
                    <div className="pt-4 flex items-center text-emerald-600 font-bold text-sm gap-1">
                      Learn More <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-900 rounded-[40px] p-12 text-white overflow-hidden relative">
                <div className="relative z-10 space-y-6 max-w-xl">
                  <h3 className="text-4xl font-bold leading-tight">Join the Circular Revolution.</h3>
                  <p className="text-gray-400 text-lg">
                    Every item you scan and every circular choice you make helps bend the curve of global waste.
                  </p>
                  <button 
                    onClick={() => setActiveTab('scanner')}
                    className="px-8 py-4 bg-white text-gray-900 rounded-2xl font-bold hover:bg-emerald-50 transition-colors"
                  >
                    Get Started Now
                  </button>
                </div>
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                  <div className="absolute inset-0 bg-linear-to-br from-emerald-500 to-teal-500 blur-[100px]" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 py-8"
            >
              <section className="text-center space-y-4">
                <h2 className="text-4xl font-bold tracking-tight text-gray-900">Scan History</h2>
                <p className="text-gray-500 max-w-2xl mx-auto">
                  Review your past circularity assessments and track your progress.
                </p>
              </section>

              {history.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-[40px] space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <History className="w-8 h-8" />
                  </div>
                  <p className="text-gray-500 font-medium">No scans yet. Start scanning to build your history!</p>
                  <button 
                    onClick={() => setActiveTab('scanner')}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors"
                  >
                    Go to Scanner
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {history.map((item) => (
                    <motion.div 
                      layout
                      key={item.id}
                      className="glass-card rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-6 w-full sm:w-auto">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <Recycle className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {item.category}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.date).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-xl font-bold text-gray-900">{item.itemName}</h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-center">
                          <div className="text-2xl font-black text-emerald-600">{item.circularityScore}/10</div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Score</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setAnalysis(item);
                              setCapturedImage(item.image);
                              setActiveTab('scanner');
                            }}
                            className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                            title="View details"
                          >
                            <ArrowRight className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Delete entry"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-emerald-100 px-6 py-4 flex items-center justify-around z-50">
        <button 
          onClick={() => setActiveTab('scanner')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'scanner' ? "text-emerald-600" : "text-gray-400")}
        >
          <Camera className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Scan</span>
        </button>
        <button 
          onClick={() => setActiveTab('impact')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'impact' ? "text-emerald-600" : "text-gray-400")}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Impact</span>
        </button>
        <button 
          onClick={() => setActiveTab('circularity')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'circularity' ? "text-emerald-600" : "text-gray-400")}
        >
          <RefreshCcw className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Hub</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={cn("flex flex-col items-center gap-1", activeTab === 'history' ? "text-emerald-600" : "text-gray-400")}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">History</span>
        </button>
      </nav>

      <canvas ref={canvasRef} className="hidden" />

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedback && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedback(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Feedback</h3>
                  <button 
                    onClick={() => setShowFeedback(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                {feedbackSubmitted ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center space-y-4"
                  >
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Thank You!</h4>
                    <p className="text-gray-500">Your feedback helps EcoSphere grow smarter.</p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Feedback Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFeedbackType('incorrect')}
                          className={cn(
                            "py-3 px-4 rounded-2xl text-sm font-bold transition-all border-2",
                            feedbackType === 'incorrect' 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                              : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          Incorrect Analysis
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackType('improvement')}
                          className={cn(
                            "py-3 px-4 rounded-2xl text-sm font-bold transition-all border-2",
                            feedbackType === 'improvement' 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                              : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          Suggestion
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Your Message</label>
                      <textarea
                        required
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={feedbackType === 'incorrect' ? "Tell us what was wrong..." : "How can we improve?"}
                        className="w-full h-32 p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl text-sm transition-all outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingFeedback}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingFeedback ? (
                        <RefreshCcw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit Feedback
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
