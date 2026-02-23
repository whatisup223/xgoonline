import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  ExternalLink,
  Search,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  MousePointer2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layout,
  Globe,
  Share2,
  RefreshCw,
  LayoutList,
  PenTool,
  Image as ImageIcon,
  ChevronDown,
  Check,
  Link2,
  PieChart as PieIcon,
  Bell,
  Settings,
  Plus,
  X,
  Info,
  Clipboard,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  Zap,
  Rocket,
  Star,
  Tag
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import CreditsBanner from '../components/CreditsBanner';

const DATA = [
  { name: 'Mon', upvotes: 400, replies: 24, reach: 2400 },
  { name: 'Tue', upvotes: 300, replies: 13, reach: 2210 },
  { name: 'Wed', upvotes: 600, replies: 35, reach: 2290 },
  { name: 'Thu', upvotes: 800, replies: 48, reach: 3000 },
  { name: 'Fri', upvotes: 500, replies: 28, reach: 2181 },
  { name: 'Sat', upvotes: 700, replies: 42, reach: 2500 },
  { name: 'Sun', upvotes: 900, replies: 56, reach: 3100 },
];

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-500 group">
    <div className="flex items-start justify-between mb-6">
      <div className={`p-4 rounded-2xl ${color} shadow-lg transition-transform group-hover:scale-110`}>
        <Icon size={26} />
      </div>
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${trend?.startsWith('+') ? 'bg-green-50 text-green-600' : (trend?.startsWith('-') ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500')}`}>
        <TrendingUp size={12} className={trend?.startsWith('-') ? 'rotate-180' : ''} />
        {trend}
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="text-slate-400 text-[11px] font-extrabold uppercase tracking-[0.2em]">{label}</h3>
      <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
    </div>
  </div>
);

export const Analytics: React.FC = () => {
  const { user, syncUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [postsHistory, setPostsHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'posts' | 'links'>('comments');
  const [redditStatus, setRedditStatus] = useState<{ connected: boolean; accounts: any[] }>({ connected: false, accounts: [] });
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [trackingLinks, setTrackingLinks] = useState<any[]>([]);

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState<'24h' | '7d' | '30d' | 'all' | 'custom'>('7d');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const ts = Date.now(); // Cache busting
      const historyRes = await fetch(`/api/user/replies/sync?userId=${user.id}&_=${ts}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(Array.isArray(historyData) ? historyData : []);
      }

      const postsRes = await fetch(`/api/user/posts/sync?userId=${user.id}&_=${ts}`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPostsHistory(Array.isArray(postsData) ? postsData : []);
      }

      const tracksRes = await fetch(`/api/tracking/user/${user.id}?_=${ts}`);
      if (tracksRes.ok) {
        const tracksData = await tracksRes.json();
        console.log(`[DEBUG] Received ${tracksData.length} links for user ${user.id}`);
        setTrackingLinks(Array.isArray(tracksData) ? tracksData : []);
      }

      const profileRes = await fetch(`/api/user/reddit/profile?userId=${user.id}${selectedAccount !== 'all' ? `&username=${selectedAccount}` : ''}&_=${ts}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }

      const statusRes = await fetch(`/api/user/reddit/status?userId=${user.id}&_=${ts}`);
      if (statusRes.ok) {
        const status = await statusRes.json();
        setRedditStatus(status);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, selectedAccount]);

  const filteredHistory = (activeTab === 'comments' ? history : postsHistory).filter(item => {
    const itemDate = new Date(item.deployedAt);
    const now = new Date();

    if (dateFilter === '24h') return (now.getTime() - itemDate.getTime()) <= 24 * 60 * 60 * 1000;
    if (dateFilter === '7d') return (now.getTime() - itemDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
    if (dateFilter === '30d') return (now.getTime() - itemDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
    if (dateFilter === 'all') return true;
    if (dateFilter === 'custom' && customRange.start && customRange.end) {
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59);
      return itemDate >= start && itemDate <= end;
    }
    return true;
  }).filter(item => {
    if (selectedAccount === 'all') return true;
    return item.redditUsername === selectedAccount;
  });

  const filteredTrackingLinks = useMemo(() => {
    // If 'all' is selected, show everything
    if (dateFilter === 'all') return trackingLinks;

    const now = new Date();
    let msLimit = 0;
    if (dateFilter === '24h') msLimit = 24 * 60 * 60 * 1000;
    else if (dateFilter === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
    else if (dateFilter === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;

    return trackingLinks.filter(item => {
      const createDate = new Date(item.createdAt || item.deployedAt);
      const isCreatedRecently = msLimit > 0 ? (now.getTime() - createDate.getTime()) <= msLimit : true;

      // Always show links that have recent clicks, even if created long ago
      const hasRecentClicks = item.clickDetails?.some((c: any) => {
        const clickDate = new Date(c.timestamp);
        return msLimit > 0 ? (now.getTime() - clickDate.getTime()) <= msLimit : true;
      });

      // If it's a custom range
      if (dateFilter === 'custom' && customRange.start && customRange.end) {
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        end.setHours(23, 59, 59);
        const isCreatedInRange = createDate >= start && createDate <= end;
        const hasClicksInRange = item.clickDetails?.some((c: any) => {
          const clickDate = new Date(c.timestamp);
          return clickDate >= start && clickDate <= end;
        });
        return isCreatedInRange || hasClicksInRange;
      }

      return isCreatedRecently || hasRecentClicks;
    }).filter(item => {
      if (selectedAccount === 'all') return true;
      return item.redditUsername === selectedAccount;
    });
  }, [trackingLinks, dateFilter, customRange, selectedAccount]);

  const activeHistory = filteredHistory;
  const activeLinks = filteredTrackingLinks;

  const chartData = useMemo(() => {
    const dataByDate: Record<string, any> = {};
    const sourceData = activeTab === 'links' ? activeLinks : activeHistory;

    if (activeTab === 'links') {
      sourceData.forEach((current: any) => {
        if (current.clickDetails && current.clickDetails.length > 0) {
          current.clickDetails.forEach((click: any) => {
            const dateObj = new Date(click.timestamp);
            if (isNaN(dateObj.getTime())) return;
            const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dataByDate[dateKey]) {
              dataByDate[dateKey] = { name: dateKey, clicks: 0, upvotes: 0, replies: 0 };
            }
            dataByDate[dateKey].clicks += 1;
          });
        }
      });
    } else {
      sourceData.forEach((current: any) => {
        const ts = current.deployedAt;
        if (!ts) return;
        const dateObj = new Date(ts);
        if (isNaN(dateObj.getTime())) return;
        const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dataByDate[dateKey]) {
          dataByDate[dateKey] = { name: dateKey, clicks: 0, upvotes: 0, replies: 0 };
        }
        dataByDate[dateKey].upvotes += current.ups || 0;
        dataByDate[dateKey].replies += current.replies || 0;
      });
    }

    return Object.values(dataByDate).sort((a, b) => {
      const year = new Date().getFullYear();
      const dateA = new Date(a.name + ' ' + year);
      const dateB = new Date(b.name + ' ' + year);
      return dateA.getTime() - dateB.getTime();
    });
  }, [activeTab, activeLinks, activeHistory]);

  const displayData = chartData.length > 0 ? chartData : [{ name: 'Today', upvotes: 0, replies: 0, clicks: 0 }];

  const totalUpvotes = activeHistory.reduce((a, b) => a + (b.ups || 0), 0);
  const totalReplies = activeHistory.reduce((a, b) => a + (b.replies || 0), 0);

  // Smart Clicks Calculation
  const totalClicks = useMemo(() => {
    if (dateFilter === 'all') return trackingLinks.reduce((a, b) => a + (Number(b.clicks) || 0), 0);

    const now = new Date();
    let msLimit = 0;
    if (dateFilter === '24h') msLimit = 24 * 60 * 60 * 1000;
    else if (dateFilter === '7d') msLimit = 7 * 24 * 60 * 60 * 1000;
    else if (dateFilter === '30d') msLimit = 30 * 24 * 60 * 60 * 1000;

    return trackingLinks.reduce((total, link) => {
      if (link.clickDetails && link.clickDetails.length > 0) {
        const recentDetails = link.clickDetails.filter((c: any) => {
          const clickDate = new Date(c.timestamp);
          if (msLimit > 0) return (now.getTime() - clickDate.getTime()) <= msLimit;
          if (dateFilter === 'custom' && customRange.start && customRange.end) {
            const start = new Date(customRange.start);
            const end = new Date(customRange.end);
            return clickDate >= start && clickDate <= end;
          }
          return true;
        }).length;

        const createDate = new Date(link.createdAt || link.deployedAt);
        const isNew = msLimit > 0 ? (now.getTime() - createDate.getTime()) <= msLimit : true;
        if (recentDetails === 0 && isNew) return total + (Number(link.clicks) || 0);

        return total + recentDetails;
      }

      const createDate = new Date(link.createdAt || link.deployedAt);
      const isNew = msLimit > 0 ? (now.getTime() - createDate.getTime()) <= msLimit : true;
      return total + (isNew ? (Number(link.clicks) || 0) : 0);
    }, 0);
  }, [trackingLinks, dateFilter, customRange]);

  const activeSubreddits = new Set([...activeHistory, ...activeLinks].map(r => r.subreddit)).size;

  const sentimentData = [
    { name: 'Supportive', value: activeHistory.filter(h => h.ups > 2).length, color: '#10b981' },
    { name: 'Neutral', value: activeHistory.filter(h => (h.ups || 0) <= 2 && (h.ups || 0) >= 0).length, color: '#94a3b8' },
    { name: 'Critical', value: activeHistory.filter(h => (h.ups || 0) < 0).length, color: '#ef4444' },
  ];

  const subPerformance = [...activeHistory, ...activeLinks].reduce((acc: any, curr) => {
    const sub = curr.subreddit;
    if (!sub) return acc;
    const score = (curr.ups || 0) + (curr.replies || 0) + (curr.clicks || 0);
    acc[sub] = (acc[sub] || 0) + score;
    return acc;
  }, {});

  const exportToCSV = (link: any) => {
    if (!link || !link.clickDetails || link.clickDetails.length === 0) {
      showToast('No clicks to export', 'error');
      return;
    }

    // CSV Headers
    const headers = ['Timestamp', 'IP', 'Country', 'City', 'Region', 'OS', 'Referer', 'User Agent', 'Type'];

    // Create rows and handle CSV escaping (basic)
    const rows = link.clickDetails.map((c: any) => [
      new Date(c.timestamp).toLocaleString(),
      c.ip,
      `"${c.country || ''}"`,
      `"${c.city || ''}"`,
      `"${c.region || ''}"`,
      `"${c.os || ''}"`,
      `"${c.referer || ''}"`,
      `"${(c.userAgent || '').replace(/"/g, '""')}"`,
      c.isBot ? 'Bot' : (c.isSpam ? 'Spam' : 'Real User')
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link_element = document.createElement('a');
    link_element.setAttribute('href', url);
    link_element.setAttribute('download', `tracking_link_${link.id}_stats.csv`);
    link_element.style.visibility = 'hidden';
    document.body.appendChild(link_element);
    link_element.click();
    document.body.removeChild(link_element);
    showToast('CSV Exported Successfully!');
  };

  const topSubs = Object.entries(subPerformance)
    .map(([name, score]: any) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in font-['Outfit'] pt-4">
      {toast && (
        <div className={`fixed top-10 right-10 z-[300] p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10 duration-500 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

      {selectedEntry && activeTab !== 'links' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-600 rounded-2xl text-white">
                  <LayoutList size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Outreach Details</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">r/{selectedEntry.subreddit} • {new Date(selectedEntry.deployedAt).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">Original Post</h3>
                  </div>
                  <a href={selectedEntry.postUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    View on Reddit <ExternalLink size={12} />
                  </a>
                </div>
                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">{selectedEntry.postTitle}</h4>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.postContent || "No body content available."}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-orange-600 rounded-full"></span>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">Our AI Reply</h3>
                </div>
                <div className="bg-orange-50/30 rounded-3xl p-8 border border-orange-100 relative">
                  <div className="absolute top-0 right-10 -translate-y-1/2 bg-orange-600 text-white px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-orange-200">
                    {selectedEntry.productMention} Mentioned
                  </div>
                  <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap italic font-medium">"{selectedEntry.comment}"</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-4 font-bold">
              <button onClick={() => setSelectedEntry(null)} className="px-8 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-slate-600 hover:shadow-md transition-all active:scale-95">Close</button>
              <a href={selectedEntry.postUrl} target="_blank" rel="noreferrer" className="px-8 py-4 bg-orange-600 text-white rounded-[1.5rem] shadow-lg shadow-orange-100 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2">
                Verify on Live Reddit <ExternalLink size={18} />
              </a>
            </div>
          </div>
        </div>
      )}

      {selectedEntry && activeTab === 'links' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] animate-in zoom-in-95 duration-300 relative">

            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-3 mb-2 font-bold text-xs">
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">Tracking Link</span>
                  <span className="text-slate-400 flex items-center gap-1.5"><Clock size={12} /> {new Date(selectedEntry.createdAt).toLocaleDateString()}</span>
                </div>
                <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight break-all" title={selectedEntry.originalUrl}>{selectedEntry.originalUrl}</h2>
                <div className="flex items-center gap-2 text-slate-500 font-bold mt-2">
                  Targeted: <span className="text-orange-600">r/{selectedEntry.subreddit}</span>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors mt-auto mb-auto bg-white border border-slate-100 shadow-sm active:scale-95">
                <X size={20} className="stroke-[3]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><MousePointer2 size={24} /></div>
                  <span className="text-3xl font-black text-slate-900">{selectedEntry.clicks}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Clicks</span>
                </div>
                <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><Globe size={24} /></div>
                  <span className="text-3xl font-black text-slate-900">{new Set((selectedEntry.clickDetails || []).map((c: any) => c.ip)).size}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Unique IPs</span>
                </div>
              </div>

              {selectedEntry.clickDetails && selectedEntry.clickDetails.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">Device Types</h3>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const getDevice = (ua: string) => ua.toLowerCase().includes('mobile') || ua.toLowerCase().includes('android') || ua.toLowerCase().includes('iphone') ? 'Mobile Devices' : 'Desktop / PC';
                      const devices = (selectedEntry.clickDetails || []).reduce((acc: any, curr: any) => {
                        const dev = getDevice(curr.userAgent || '');
                        acc[dev] = (acc[dev] || 0) + 1;
                        return acc;
                      }, {});
                      return Object.entries(devices).map(([dev, count]: any) => (
                        <div key={dev} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                              {dev === 'Mobile Devices' ? <LayoutList size={14} /> : <Layout size={14} />}
                            </div>
                            <span className="font-bold text-slate-700">{dev}</span>
                          </div>
                          <span className="font-extrabold text-slate-900">{count} clicks</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {selectedEntry.clickDetails && selectedEntry.clickDetails.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">Recent Click Timeline</h3>
                  </div>
                  <div className="border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                    {[...(selectedEntry.clickDetails)].reverse().slice(0, 15).map((click: any, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[31px] w-4 h-4 bg-white border-4 border-blue-500 rounded-full top-1 shadow-sm"></div>
                        <div className="space-y-2">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="font-black text-slate-900 text-sm whitespace-nowrap">{new Date(click.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            {idx === 0 && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">Latest</span>}
                            {click.isBot && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">Bot</span>}
                            {click.isSpam && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">Spam</span>}
                          </div>
                          <div className="text-[11px] font-bold text-slate-400 capitalize bg-slate-50 w-fit max-w-full px-3 py-2 rounded-xl border border-slate-100 break-all space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              {click.userAgent.includes('Mobile') ? <LayoutList size={12} /> : <Layout size={12} />}
                              <span>{click.os || (click.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop')} • {click.ip}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Globe size={12} className="text-blue-500" />
                              <span>
                                {[click.city, click.region, click.country].filter(Boolean).join(', ') || (click.ip === '127.0.0.1' || click.ip === '::1' ? 'Local Network' : 'Unknown Location')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-4 font-bold">
              <button onClick={() => { const url = `${window.location.origin}/t/${selectedEntry.id}`; navigator.clipboard.writeText(url); showToast('Tracking URL Copied!'); }} className="flex-1 min-w-[140px] px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-[1.5rem] hover:text-blue-600 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
                <Copy size={18} /> Copy Link
              </button>
              <button onClick={() => exportToCSV(selectedEntry)} className="flex-1 min-w-[140px] px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-[1.5rem] hover:text-blue-600 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm">
                <LayoutList size={18} /> Export CSV
              </button>
              <button onClick={() => setSelectedEntry(null)} className="w-full md:w-fit px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95">
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-slate-400 font-semibold text-sm">Welcome back, {user?.name?.split(' ')[0] || 'there'}</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-7 bg-orange-600 rounded-full" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics</h1>
          </div>
          <p className="text-slate-400 font-medium text-sm pl-4">Real-time data for your Reddit ecosystem.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-200/60 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all font-bold text-slate-600 active:scale-95">
              <Calendar size={20} className="text-orange-600" />
              <span className="min-w-[100px] text-left">
                {dateFilter === '24h' ? 'Past 24 Hours' :
                  dateFilter === '7d' ? 'Past 7 Days' :
                    dateFilter === '30d' ? 'Past 30 Days' :
                      dateFilter === 'all' ? 'All Time' :
                        'Custom Range'}
              </span>
              <ChevronDown size={18} className={`text-slate-300 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)}></div>
                <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 z-20 animate-in fade-in zoom-in-95 duration-200">
                  {['24h', '7d', '30d', 'all'].map((id) => (
                    <button key={id} onClick={() => { setDateFilter(id as any); setShowFilterDropdown(false); }} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-bold transition-colors ${dateFilter === id ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {id === '24h' ? 'Past 24 Hours' : id === '7d' ? 'Past 7 Days' : id === '30d' ? 'Past 30 Days' : 'All Time'}
                      {dateFilter === id && <Check size={16} />}
                    </button>
                  ))}
                  <div className="h-px bg-slate-100 my-2 mx-5"></div>
                  <button onClick={() => { setShowDatePicker(true); setShowFilterDropdown(false); }} className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-bold transition-colors ${dateFilter === 'custom' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                    Custom Range...
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-[1.5rem] px-4 py-4 shadow-sm h-[60px]">
            <Users size={18} className="text-blue-600" />
            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-900 focus:outline-none min-w-[140px] cursor-pointer">
              <option value="all">All Accounts</option>
              {redditStatus.accounts?.map(acc => <option key={acc.username} value={acc.username}>u/{acc.username}</option>)}
            </select>
          </div>
        </div>
      </div>

      <CreditsBanner plan={user?.plan || 'Starter'} credits={user?.credits || 0} />

      <div className="w-full overflow-x-auto pb-4 -mb-4 custom-scrollbar lg:overflow-visible">
        <div className="flex p-1.5 bg-slate-100 rounded-[2rem] w-fit mx-auto lg:mx-0 min-w-max">
          <button onClick={() => setActiveTab('comments')} className={`flex items-center gap-2 px-6 lg:px-8 py-3.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'comments' ? 'bg-white text-slate-900 shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
            <MessageSquare size={18} className={activeTab === 'comments' ? 'text-orange-600' : ''} />
            COMMENTS
          </button>
          <button onClick={() => setActiveTab('posts')} className={`flex items-center gap-2 px-6 lg:px-8 py-3.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'posts' ? 'bg-white text-slate-900 shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
            <PenTool size={18} className={activeTab === 'posts' ? 'text-orange-600' : ''} />
            POSTS
          </button>
          <button onClick={() => setActiveTab('links')} className={`flex items-center gap-2 px-6 lg:px-8 py-3.5 rounded-[1.5rem] text-sm font-black transition-all ${activeTab === 'links' ? 'bg-white text-slate-900 shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
            <Link2 size={18} className={activeTab === 'links' ? 'text-blue-600' : ''} />
            LINKS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          label={activeTab === 'comments' ? "Total Upvotes" : (activeTab === 'posts' ? "Post Karma" : "Link Reach")}
          value={activeTab === 'links' ? activeLinks.length : totalUpvotes.toLocaleString()}
          trend={activeTab === 'links' ? `${trackingLinks.length} Total` : "+12.5%"}
          icon={activeTab === 'links' ? BarChart3 : (activeTab === 'comments' ? MessageSquare : PenTool)}
          color={activeTab === 'links' ? "bg-blue-600 text-white" : "bg-orange-600 text-white"}
        />
        <StatCard
          label={activeTab === 'links' ? "Avg Click Rate" : "Account Authority"}
          value={activeTab === 'links' ? (trackingLinks.length > 0 ? (totalClicks / trackingLinks.length).toFixed(1) : "0.0") : (profile ? (activeTab === 'comments' ? profile.commentKarma.toLocaleString() : (profile.linkKarma || profile.totalKarma).toLocaleString()) : "---")}
          trend="Live"
          icon={activeTab === 'links' ? TrendingUp : Users}
          color={activeTab === 'links' ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}
        />
        <StatCard
          label="Total Link Clicks"
          value={totalClicks.toLocaleString()}
          trend="Real-time"
          icon={MousePointer2}
          color="bg-indigo-600 text-white"
        />
        <StatCard
          label="Target Communities"
          value={activeSubreddits}
          trend="Active"
          icon={ExternalLink}
          color="bg-slate-900 text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-extrabold text-slate-900">Sentiment Pulse</h2>
            <PieIcon className="text-slate-300" size={20} />
          </div>
          <div className="h-[280px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {sentimentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900">{Math.round((sentimentData[0].value / (history.length || 1)) * 100)}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Positive</span>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            {sentimentData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm font-bold text-slate-500">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-extrabold text-slate-900">Top Communities</h2>
            <BarChart3 className="text-slate-300" size={20} />
          </div>
          <div className="flex-1 space-y-6">
            {topSubs.length > 0 ? topSubs.map((sub: any, i) => (
              <div key={sub.name} className="group cursor-default">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors">r/{sub.name}</span>
                  <span className="text-xs font-bold text-slate-400">{sub.score} pts</span>
                </div>
                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-orange-600' : i === 1 ? 'bg-blue-600' : 'bg-purple-600'}`} style={{ width: `${(sub.score / (topSubs[0]?.score || 1)) * 100}%` }}></div>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200"><Users size={32} /></div>
                <p className="text-sm font-bold text-slate-400">Deploy replies to see performance ranking.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xl font-extrabold text-slate-900">Growth Velocity</h2>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-600"></span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.2} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient>
                  <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '5 5' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }} />
                <Area type="monotone" dataKey={activeTab === 'links' ? "clicks" : "upvotes"} stroke={activeTab === 'links' ? "#2563eb" : "#f97316"} strokeWidth={4} fillOpacity={1} fill={activeTab === 'links' ? "url(#colorClick)" : "url(#colorUp)"} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden mb-10">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-900">{activeTab === 'links' ? 'Link Tracking History' : 'Outreach History'}</h2>
            {(activeTab === 'links' ? activeLinks : activeHistory).length > 0 && (
              <span className={`px-2 py-0.5 text-white text-[10px] font-black rounded-lg ${activeTab === 'links' ? 'bg-blue-600' : 'bg-slate-900'}`}>
                {(activeTab === 'links' ? activeLinks : activeHistory).length}
              </span>
            )}
          </div>
          <button onClick={() => fetchData()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-orange-600 transition-all active:scale-95 shadow-sm">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4"><RefreshCw className="animate-spin text-orange-600" size={32} /></div>
          ) : (activeTab === 'links' ? activeLinks : activeHistory).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                {activeTab === 'links' ? <Link2 size={32} /> : <LayoutList size={32} />}
              </div>
              <p className="text-slate-900 font-bold">No {activeTab} tracked yet</p>
            </div>
          ) : (
            <table className="w-full text-sm font-medium">
              <thead className="bg-slate-50/50 text-slate-400 text-[11px] font-extrabold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-4 md:px-10 py-5 text-left">{activeTab === 'links' ? 'Target Subreddit' : 'Origin'}</th>
                  <th className="px-4 md:px-10 py-5 text-left">{activeTab === 'links' ? 'Original URL' : 'Content Preview'}</th>
                  <th className="px-4 md:px-10 py-5 text-left">{activeTab === 'links' ? 'Clicks' : 'Performance'}</th>
                  <th className="hidden md:table-cell px-10 py-5 text-left">Date Deployed</th>
                  <th className="px-4 md:px-10 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'links' ? activeLinks : activeHistory).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 group transition-all">
                    <td className="px-4 md:px-10 py-6">
                      <span className={`font-black ${activeTab === 'links' ? 'text-blue-600' : 'text-slate-900'}`}>r/{row.subreddit}</span>
                    </td>
                    <td className="px-4 md:px-10 py-6">
                      <div className="flex flex-col gap-0.5 max-w-[150px] md:max-w-xs">
                        <span className="font-bold text-slate-900 truncate" title={activeTab === 'links' ? row.originalUrl : row.postTitle}>
                          {activeTab === 'links' ? row.originalUrl : row.postTitle}
                        </span>
                        {activeTab === 'comments' && <span className="text-[10px] text-slate-400 line-clamp-1 italic">"{row.comment}"</span>}
                      </div>
                    </td>
                    <td className="px-4 md:px-10 py-6">
                      <div className="flex items-center gap-2">
                        <MousePointer2 size={14} className="text-blue-500" />
                        <span className="font-extrabold text-slate-700">{activeTab === 'links' ? row.clicks : row.ups}</span>
                        {activeTab !== 'links' && <><MessageSquare size={14} className="text-slate-300 ml-2" /><span className="text-slate-500 font-bold">{row.replies}</span></>}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-10 py-6 text-xs text-slate-400 font-bold">
                      {new Date(row.createdAt || row.deployedAt).toLocaleString()}
                    </td>
                    <td className="px-4 md:px-10 py-6 text-right">
                      {activeTab === 'links' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setSelectedEntry(row)} className="px-3 md:px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all active:scale-95 text-xs md:text-sm">
                            <span className="hidden sm:inline">Details</span>
                            <span className="sm:hidden"><MousePointer2 size={14} /></span>
                          </button>
                          <button onClick={() => { const url = `${window.location.origin}/t/${row.id}`; navigator.clipboard.writeText(url); showToast('Link copied!'); }} className="px-3 py-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all active:scale-95"><Copy size={16} /></button>
                          <a href={row.originalUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><ExternalLink size={16} /></a>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setSelectedEntry(row)} className="px-3 md:px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-900 hover:text-white transition-all text-xs md:text-sm">Details</button>
                          <a href={row.postUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><ExternalLink size={16} /></a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showDatePicker && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 mb-6 text-center">Select Range</h3>
            <div className="space-y-4 mb-8">
              <input type="date" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
              <input type="date" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowDatePicker(false)} className="py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase text-slate-500">Cancel</button>
              <button onClick={() => { setDateFilter('custom'); setShowDatePicker(false); }} disabled={!customRange.start || !customRange.end} className="py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-100">Apply Filter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
