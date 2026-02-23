
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    LifeBuoy,
    Plus,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    MessageSquare,
    Send,
    User,
    Shield,
    Calendar,
    X,
    MoreVertical,
    RefreshCw,
    Archive,
    Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Ticket {
    id: string;
    subject: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    category: string;
    createdAt: string;
    updatedAt: string;
    userName?: string;
    userEmail?: string;
    messages: Message[];
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'admin';
    timestamp: string;
}

const mockTickets: Ticket[] = []; // Removed fake tickets

export const Support: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const isAdminRole = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('manager');
    const isAdminPath = location.pathname.includes('/admin/');
    const isAdmin = isAdminRole && isAdminPath;

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Load tickets from API on mount
    const fetchData = async () => {
        if (!user?.email) return;
        setIsLoading(true);
        try {
            const role = isAdmin ? 'admin' : 'user';
            const token = localStorage.getItem('token');
            const headers: any = {};
            if (isAdmin && token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`/api/support/tickets?email=${user.email}&role=${role}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setTickets(data);

                // Keep active ticket updated if it exists
                if (activeTicket) {
                    const updated = data.find((t: Ticket) => t.id === activeTicket.id);
                    if (updated) setActiveTicket(updated);
                }
            }
        } catch (e) {
            console.error("Failed to fetch tickets", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Poll for updates every 10 seconds if on support page
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [user?.email, isAdmin]);

    // Form states
    const [newSubject, setNewSubject] = useState('');
    const [newCategory, setNewCategory] = useState('Technical');
    const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newDescription, setNewDescription] = useState('');

    const handleOpenTicket = async () => {
        if (!newSubject.trim() || !newDescription.trim()) return;

        const ticketData = {
            subject: newSubject,
            description: newDescription,
            status: 'open',
            priority: newPriority,
            category: newCategory,
            userName: user?.name,
            userEmail: user?.email,
            messages: [{ id: '1', text: newDescription, sender: 'user', timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16) }]
        };

        try {
            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            });
            if (res.ok) {
                setNewSubject('');
                setNewDescription('');
                setIsCreateModalOpen(false);
                fetchData();
            }
        } catch (e) {
            alert("Failed to create ticket");
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeTicket) return;

        const msg: Message = {
            id: Date.now().toString(),
            text: newMessage,
            sender: isAdmin ? 'admin' : 'user',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };

        const updatedMessages = [...activeTicket.messages, msg];
        const updateData: any = {
            messages: updatedMessages,
        };

        if (isAdmin && activeTicket.status === 'open') {
            updateData.status = 'in_progress';
        }

        try {
            const res = await fetch(`/api/support/tickets/${activeTicket.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            if (res.ok) {
                setNewMessage('');
                fetchData();
            }
        } catch (e) {
            alert("Failed to send message");
        }
    };

    const updateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
        try {
            const res = await fetch(`/api/support/tickets/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (e) {
            alert("Failed to update status");
        }
    };

    const handleDeleteTicket = async (ticketId: string) => {
        if (!confirm('Are you sure you want to permanently delete this ticket? it will be removed from the database and the user will not see it anymore.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/support/tickets/${ticketId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setActiveTicket(null);
                fetchData();
            } else {
                alert("Failed to delete ticket");
            }
        } catch (e) {
            alert("Error deleting ticket");
        }
    };

    const filteredTickets = tickets.filter(t => {
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toLowerCase().includes(searchQuery.toLowerCase());

        // Admin sees EVERYTHING if they are on the admin path AND have the role
        // Or if we just want to trust the path for now while debugging
        if (isAdmin) return matchesStatus && matchesSearch;

        // User views only their own
        return matchesStatus && matchesSearch && (t.userEmail === user?.email);
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'in_progress': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'resolved': return 'bg-green-100 text-green-600 border-green-200';
            case 'closed': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'low': return 'bg-slate-100 text-slate-500';
            case 'medium': return 'bg-orange-100 text-orange-600';
            case 'high': return 'bg-red-100 text-red-600';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    // Stats for Admin
    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length,
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-100">
                            <LifeBuoy size={24} />
                        </div>
                        {isAdmin ? 'Support Management' : 'Support Center'}
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        {isAdmin ? 'Monitor system health and resolve user issues.' : 'Get help with your account, billing, or technical issues.'}
                    </p>
                </div>

                {!isAdmin && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            disabled={isLoading}
                            className={`p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-orange-600 transition-all ${isLoading ? 'animate-spin' : ''}`}
                            title="Refresh Tickets"
                        >
                            <RefreshCw size={20} />
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3.5 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Plus size={20} />
                            Open New Ticket
                        </button>
                    </div>
                )}
                {isAdmin && (
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all ${isLoading ? 'opacity-50' : ''}`}
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        {isLoading ? 'Syncing...' : 'Refresh List'}
                    </button>
                )}
            </div>

            {isLoading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <RefreshCw size={48} className="text-orange-600 animate-spin mb-4" />
                    <p className="font-bold text-slate-900">Loading your tickets...</p>
                </div>
            ) : (
                <>

                    {/* Support Stats Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                        {[
                            { label: 'Total Tickets', value: stats.total, icon: LifeBuoy, color: 'text-slate-600', bg: 'bg-white' },
                            { label: 'Awaiting', value: stats.open, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50/50' },
                            { label: 'In Progress', value: stats.inProgress, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50/50' },
                            { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50/50' },
                            { label: 'Closed', value: stats.closed, icon: Archive, color: 'text-slate-500', bg: 'bg-slate-50/50' },
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} p-6 rounded-[2rem] border border-slate-200/60 shadow-sm transition-all hover:shadow-md`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-2.5 rounded-xl bg-white shadow-sm ${stat.color}`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <span className="text-2xl font-black text-slate-900">{stat.value}</span>
                                </div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-280px)] min-h-[600px]">
                        {/* Ticket List (Left Column) */}
                        <div className={`lg:col-span-4 flex flex-col gap-4 ${activeTicket ? 'hidden lg:flex' : 'flex'}`}>
                            {/* Filters & Search */}
                            <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search tickets..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="open">Open</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            {/* List Scroll Area */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                {filteredTickets.map((ticket) => (
                                    <button
                                        key={ticket.id}
                                        onClick={() => setActiveTicket(ticket)}
                                        className={`w-full text-left p-5 rounded-3xl border transition-all group ${activeTicket?.id === ticket.id
                                            ? 'bg-orange-600 border-orange-600 shadow-xl shadow-orange-100'
                                            : 'bg-white border-slate-200/60 hover:border-orange-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeTicket?.id === ticket.id ? 'text-orange-100' : 'text-slate-400'}`}>
                                                {ticket.id}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${activeTicket?.id === ticket.id ? 'bg-white/20 border-white/20 text-white' : getStatusColor(ticket.status)
                                                }`}>
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <h3 className={`font-bold text-sm truncate mb-1 ${activeTicket?.id === ticket.id ? 'text-white' : 'text-slate-900 group-hover:text-orange-600'}`}>
                                            {ticket.subject}
                                        </h3>
                                        {isAdmin && (
                                            <p className={`text-[11px] mb-3 truncate ${activeTicket?.id === ticket.id ? 'text-orange-100' : 'text-slate-400'}`}>
                                                From: {ticket.userName}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Clock size={12} className={activeTicket?.id === ticket.id ? 'text-orange-100' : 'text-slate-300'} />
                                                <span className={`text-[11px] font-medium ${activeTicket?.id === ticket.id ? 'text-orange-100' : 'text-slate-400'}`}>
                                                    {ticket.updatedAt}
                                                </span>
                                            </div>
                                            <ChevronRight size={14} className={activeTicket?.id === ticket.id ? 'text-white' : 'text-slate-300 group-hover:translate-x-1 transition-transform'} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ticket Details (Right Column) */}
                        <div className={`lg:col-span-8 flex flex-col bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden ${!activeTicket ? 'hidden lg:flex' : 'flex'}`}>
                            {activeTicket ? (
                                <>
                                    {/* Detail Header */}
                                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setActiveTicket(null)}
                                                className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl"
                                            >
                                                <X size={20} />
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-slate-400 font-bold text-xs">{activeTicket.id}</span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(activeTicket.status)}`}>
                                                        {activeTicket.status.replace('_', ' ')}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${getPriorityColor(activeTicket.priority)}`}>
                                                        {activeTicket.priority}
                                                    </span>
                                                </div>
                                                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{activeTicket.subject}</h2>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={activeTicket.status}
                                                    onChange={(e) => updateTicketStatus(activeTicket.id, e.target.value as Ticket['status'])}
                                                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-slate-600 focus:outline-none hover:bg-slate-100 transition-colors"
                                                >
                                                    <option value="open">Open</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="resolved">Resolved</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDeleteTicket(activeTicket.id)}
                                                    className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                                    title="Delete Ticket"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Chat Area */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                                        {/* Initial Description */}
                                        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 mb-8">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">{activeTicket.userName}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{activeTicket.createdAt}</p>
                                                </div>
                                            </div>
                                            <p className="text-slate-600 leading-relaxed text-sm">
                                                {activeTicket.description}
                                            </p>
                                            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category: {activeTicket.category}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {activeTicket.messages.slice(1).map((msg) => (
                                                <div key={msg.id} className={`flex ${msg.sender === (isAdmin ? 'admin' : 'user') ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-3xl p-5 ${msg.sender === (isAdmin ? 'admin' : 'user')
                                                        ? 'bg-orange-600 text-white rounded-br-lg shadow-lg shadow-orange-100'
                                                        : 'bg-slate-100 text-slate-900 rounded-bl-lg'
                                                        }`}>
                                                        <div className="flex items-center gap-2 mb-1 opacity-70">
                                                            {msg.sender === 'admin' ? <Shield size={10} /> : <User size={10} />}
                                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                                {msg.sender === 'admin' ? 'Support Agent' : 'You'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[13px] leading-relaxed font-medium">{msg.text}</p>
                                                        <p className={`text-[9px] mt-2 font-black ${msg.sender === (isAdmin ? 'admin' : 'user') ? 'text-orange-100' : 'text-slate-400'}`}>
                                                            {msg.timestamp}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reply Box */}
                                    <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/30 shrink-0">
                                        {(activeTicket.status === 'resolved' || activeTicket.status === 'closed') && !isAdmin ? (
                                            <div className="flex flex-col items-center justify-center py-4 px-6 bg-slate-100 rounded-[2rem] border border-slate-200 text-center">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 mb-2 shadow-sm">
                                                    <AlertCircle size={20} />
                                                </div>
                                                <p className="text-sm font-bold text-slate-600">This ticket is {activeTicket.status === 'resolved' ? 'Resolved' : 'Closed'}</p>
                                                <p className="text-xs text-slate-400 font-medium">You cannot send any more replies to this conversation.</p>
                                            </div>
                                        ) : (
                                            <div className="relative group">
                                                <textarea
                                                    placeholder={isAdmin && (activeTicket.status === 'resolved' || activeTicket.status === 'closed')
                                                        ? "Ticket is closed, but you can still reply as Admin..."
                                                        : "Type your reply here..."}
                                                    className="w-full bg-white border border-slate-200/60 rounded-[1.8rem] px-6 py-4 pr-32 min-h-[100px] text-sm focus:outline-none focus:border-orange-500/50 shadow-sm transition-all"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSendMessage();
                                                        }
                                                    }}
                                                />
                                                <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                                    <button
                                                        onClick={handleSendMessage}
                                                        disabled={!newMessage.trim()}
                                                        className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                                                    >
                                                        <Send size={14} />
                                                        Send Reply
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
                                    <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-400 mb-6 drop-shadow-sm">
                                        <LifeBuoy size={48} />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Select a ticket to view conversation</h3>
                                    <p className="max-w-xs text-sm font-medium mt-2">
                                        Click on any ticket from the sidebar to view details, status, and history.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Create Ticket Modal */}
                    {isCreateModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)} />
                            <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-10 animate-in fade-in zoom-in-95 duration-300">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Open New Ticket</h2>
                                    <button onClick={() => setIsCreateModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Subject</label>
                                        <input
                                            type="text"
                                            placeholder="Summarize your issue..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                                            value={newSubject}
                                            onChange={(e) => setNewSubject(e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Category</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:outline-none"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                            >
                                                <option>Technical</option>
                                                <option>Billing</option>
                                                <option>General Inquiry</option>
                                                <option>Feature Request</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Priority</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm focus:outline-none"
                                                value={newPriority}
                                                onChange={(e) => setNewPriority(e.target.value as any)}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Description</label>
                                        <textarea
                                            placeholder="Provide details about your issue..."
                                            rows={4}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all"
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        onClick={handleOpenTicket}
                                        disabled={!newSubject.trim() || !newDescription.trim()}
                                        className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-orange-100 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                                    >
                                        Submit Ticket
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
