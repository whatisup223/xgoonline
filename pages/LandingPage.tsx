
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  ShieldCheck,
  BarChart,
  Bot,
  MessageSquare,
  Globe,
  Search,
  PenTool,
  TrendingUp,
  Menu,
  X,
  Check,
  Users,
  Users2
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => setPlans(data))
      .catch(err => console.error('Failed to fetch plans', err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen font-['Outfit'] scroll-smooth">
      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/50 py-4 shadow-sm' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 ring-2 ring-orange-100">
              <Zap fill="currentColor" size={20} />
            </div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">RedditGo</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
            <button onClick={() => document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 transition-colors">Home</button>
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 transition-colors">Features</button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 transition-colors">How it Works</button>
            <button onClick={() => document.getElementById('approach')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 transition-colors">Live Demo</button>
            <button onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 transition-colors">Reviews</button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-orange-600 transition-colors">Pricing</button>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block px-6 py-3 text-slate-600 font-bold hover:text-slate-900 transition-colors">Log In</Link>
            <Link to="/signup" className="hidden sm:flex px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold border border-slate-800 hover:bg-orange-600 hover:border-orange-500 transition-all shadow-xl hover:shadow-orange-200 active:scale-95 items-center gap-2">
              Get Started <ArrowRight size={16} />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-6 space-y-4 animate-in slide-in-from-top-4 duration-300 shadow-xl">
            <div className="flex flex-col gap-4 text-base font-bold text-slate-600">
              <button onClick={() => { setIsMobileMenuOpen(false); document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left py-2 hover:text-orange-600 border-b border-slate-50 transition-colors">Home</button>
              <button onClick={() => { setIsMobileMenuOpen(false); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left py-2 hover:text-orange-600 border-b border-slate-50 transition-colors">Features</button>
              <button onClick={() => { setIsMobileMenuOpen(false); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left py-2 hover:text-orange-600 border-b border-slate-50 transition-colors">How it Works</button>
              <button onClick={() => { setIsMobileMenuOpen(false); document.getElementById('approach')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left py-2 hover:text-orange-600 border-b border-slate-50 transition-colors">Live Demo</button>
              <button onClick={() => { setIsMobileMenuOpen(false); document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left py-2 hover:text-orange-600 border-b border-slate-50 transition-colors">Reviews</button>
              <button onClick={() => { setIsMobileMenuOpen(false); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-left py-2 hover:text-orange-600 border-b border-slate-50 transition-colors">Pricing</button>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 text-center text-slate-900 font-black border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                Log In
              </Link>
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full py-4 text-center bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-200 active:scale-95 transition-all">
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-32 px-6 relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-200/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 -z-10 animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-200/30 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 -z-10 animate-pulse-slow delay-700"></div>
        <div className="absolute top-1/2 left-1/2 w-[1000px] h-[1000px] bg-white/40 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 -z-10"></div>

        <div className="max-w-7xl mx-auto text-center space-y-10 relative z-10">

          {/* Trust Badge / Version Pill */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-full pl-2 pr-4 py-1.5 text-sm font-bold text-slate-600 shadow-sm shadow-slate-200 hover:scale-105 transition-transform cursor-default animate-fade-in-up">
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">New</span>
            <span>v2.0: The AI Agent for Founders</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl md:text-8xl font-extrabold text-slate-900 tracking-tight leading-[0.95] max-w-5xl mx-auto animate-fade-in-up delay-100">
            Dominate <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4500] to-[#FF8700] relative">
              Reddit
              {/* Underline Decoration */}
              <svg className="absolute w-full h-3 -bottom-1 left-0 text-orange-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span> <br className="hidden md:block" /> without being spammy.
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            The all-in-one growth engine. Identify high-intent conversations, generate value-first AI replies, and turn karma into customers.
          </p>

          {/* Feature Highlights Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-slate-600 font-bold mt-6 animate-fade-in-up delay-200">
            <div className="flex items-center gap-2.5 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm">
              <MessageSquare size={20} className="text-orange-500" fill="currentColor" fillOpacity={0.2} />
              <span>Smart Comments</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm">
              <PenTool size={20} className="text-orange-500" fill="currentColor" fillOpacity={0.2} />
              <span>Auto Posts</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200/50 shadow-sm">
              <Bot size={20} className="text-orange-500" fill="currentColor" fillOpacity={0.2} />
              <span>Full Autopilot</span>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-fade-in-up delay-300">
            <Link to="/signup" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-[2rem] font-bold text-xl hover:shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
              <Zap size={24} className="text-white fill-white" />
              Activate Your AI Agent
            </Link>
            <button
              onClick={() => document.getElementById('approach')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 bg-white text-slate-700 border border-slate-200 rounded-[2rem] font-bold text-xl hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-1 transition-all shadow-sm flex items-center justify-center gap-3"
            >
              <Globe size={24} />
              See Live Demo
            </button>
          </div>



          {/* Dashboard Mockup - Floating Effect */}
          <div className="pt-24 relative animate-fade-in-up delay-500">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-orange-100/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="relative mx-auto max-w-5xl">
              <div className="bg-slate-900 rounded-[2rem] overflow-hidden aspect-[16/9] relative shadow-2xl shadow-slate-300 transform hover:scale-[1.01] transition-transform duration-500">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                >
                  <source src="https://cdn.pixabay.com/video/2020/05/11/38477-418833987_large.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {/* Subtle overlay gradient for better text visibility if needed */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[#f8fafc] relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Everything you need to scale.</h2>
            <p className="text-slate-500 text-lg font-medium">We've automated the tedious parts of Reddit marketing so you can focus on building relationships.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: 'AI Reply Agent',
                desc: 'Generates context-aware, helpful replies that subtly mention your product.',
                textColor: 'text-orange-600',
                cornerBg: 'bg-orange-50',
                borderColor: 'border-orange-50',
                hoverShadow: 'hover:shadow-orange-100/50'
              },
              {
                icon: ShieldCheck,
                title: 'Safe & Compliant',
                desc: 'Strict anti-spam filters ensure your account remains in good standing.',
                textColor: 'text-blue-600',
                cornerBg: 'bg-blue-50',
                borderColor: 'border-blue-50',
                hoverShadow: 'hover:shadow-blue-100/50'
              },
              {
                icon: BarChart,
                title: 'Growth Analytics',
                desc: 'Track karma, engagement, and click-through rates in real-time.',
                textColor: 'text-purple-600',
                cornerBg: 'bg-purple-50',
                borderColor: 'border-purple-50',
                hoverShadow: 'hover:shadow-purple-100/50'
              },
            ].map((f, i) => (
              <div key={i} className={`bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-2xl ${f.hoverShadow} hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 ${f.cornerBg} rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110`}></div>
                <div className="relative z-10">
                  <div className={`w-16 h-16 bg-white border-2 ${f.borderColor} ${f.textColor} rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform`}>
                    <f.icon size={28} strokeWidth={2} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{f.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>




      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Launch in 60 seconds.</h2>
            <p className="text-slate-500 text-lg">Define your goals, and let our AI handle the heavy lifting while you focus on growth.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Step 1 */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-2xl hover:shadow-orange-100/50 hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white border-2 border-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-2xl font-bold mb-8 shadow-sm group-hover:scale-110 transition-transform">01</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Connect & Train</h3>
                <p className="text-slate-500 leading-relaxed font-medium">Link your Reddit account and define your brand voice. The AI learns your unique style in seconds.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-2xl hover:shadow-blue-100/50 hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white border-2 border-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold mb-8 shadow-sm group-hover:scale-110 transition-transform">02</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Auto-Engage</h3>
                <p className="text-slate-500 leading-relaxed font-medium">Turn on 'Smart Reply'. We find high-intent threads and draft authentic, value-first responses 24/7.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-2xl hover:shadow-green-100/50 hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white border-2 border-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl font-bold mb-8 shadow-sm group-hover:scale-110 transition-transform">03</div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Watch It Grow</h3>
                <p className="text-slate-500 leading-relaxed font-medium">Track traffic, leads, and karma growth. Scale your presence effortlessly while you sleep.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Workflow Section */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">How the Engine works</h2>
            <p className="text-slate-500 text-lg">A completely autonomous growth loop designed to build authority.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Integrating connecting line for desktop */}
            <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-slate-200 via-orange-200 to-slate-200 z-0"></div>

            {[
              {
                icon: Search,
                title: "Scans Your Niche",
                desc: "Identifies relevant subreddits and tracks keyword mentions in real-time.",
                textColor: 'text-orange-600',
                cornerBg: 'bg-orange-50',
                borderColor: 'border-orange-50',
                hoverShadow: 'hover:shadow-orange-100/50'
              },
              {
                icon: MessageSquare,
                title: "Drops Comments",
                desc: "Engages with value-first comments that naturally position your product.",
                textColor: 'text-blue-600',
                cornerBg: 'bg-blue-50',
                borderColor: 'border-blue-50',
                hoverShadow: 'hover:shadow-blue-100/50'
              },
              {
                icon: PenTool,
                title: "Generates Posts",
                desc: "Researches viral hooks and crafts original posts to spark discussion.",
                textColor: 'text-purple-600',
                cornerBg: 'bg-purple-50',
                borderColor: 'border-purple-50',
                hoverShadow: 'hover:shadow-purple-100/50'
              },
              {
                icon: TrendingUp,
                title: "You Get Discovered",
                desc: "Consistent visibility drives organic traffic and warm leads to your site.",
                textColor: 'text-green-600',
                cornerBg: 'bg-green-50',
                borderColor: 'border-green-50',
                hoverShadow: 'hover:shadow-green-100/50'
              }
            ].map((item, i) => (
              <div key={i} className="relative z-10 group h-full">
                <div className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-lg hover:shadow-2xl ${item.hoverShadow} hover:-translate-y-2 transition-all duration-300 h-full flex flex-col items-center text-center relative overflow-hidden`}>

                  {/* Decorative Corner */}
                  <div className={`absolute top-0 right-0 w-24 h-24 ${item.cornerBg} rounded-bl-[80px] -mr-6 -mt-6 transition-transform group-hover:scale-110`}></div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-16 h-16 bg-white border-2 ${item.borderColor} ${item.textColor} rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                      <item.icon size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach (#approach) - Moved down */}
      <section id="approach" className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left Content: Explanation */}
            <div className="space-y-8 relative z-10">
              <span className="text-orange-600 font-bold tracking-widest text-sm uppercase">Live Demo</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Smart enough to sound <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">human.</span>
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                Most bots spam generic comments. Our engine analyzes the thread's context, sentiment, and nuances to craft replies that add actual value.
              </p>

              <div className="space-y-6">
                {[
                  { title: 'Context Analysis', desc: 'Reads the entire thread to understand tone and intent.' },
                  { title: 'Value Injection', desc: 'Adds helpful insights before subtly positioning your product.' },
                  { title: 'Anti-Hallucination', desc: 'Fact-checks specific claims against your knowledge base.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mt-1">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{item.title}</h4>
                      <p className="text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content: Visual Simulation */}
            <div className="relative">
              {/* Background decorative blob */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-orange-100/50 to-blue-100/50 rounded-full blur-3xl -z-10"></div>

              <div className="space-y-6">

                {/* Active Reddit Thread */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 relative z-10 transform transition-transform hover:scale-[1.02] duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200">
                      <span className="text-xs">u/</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">u/tech_founder_99</div>
                      <div className="text-xs text-slate-400">posted in r/SaaS • 2h ago</div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">How do you guys handle cold outreach?</h3>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    I've been trying to send emails but getting 0 replies. Is there a better way to get initial users without being spammy?
                  </p>
                  <div className="flex gap-4 text-slate-400 text-sm font-bold border-t border-slate-100 pt-4">
                    <span className="flex items-center gap-1 hover:text-orange-500 transition-colors"><MessageSquare size={16} /> 24 Comments</span>
                    <span className="flex items-center gap-1 hover:text-green-500 transition-colors"><TrendingUp size={16} /> 95% Upvoted</span>
                  </div>
                </div>

                {/* Connection Line */}
                <div className="h-10 w-0.5 bg-gradient-to-b from-slate-200 to-orange-200 mx-auto"></div>

                {/* AI Reply Card - Solution */}
                <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl border border-slate-800 relative overflow-hidden group hover:border-orange-500/50 transition-colors duration-500">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-500/20 transition-colors duration-500"></div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
                      <Bot size={16} className="animate-pulse" /> AI Agent Reply
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs font-semibold">Quality Score:</span>
                      <span className="text-green-400 text-xs font-bold">98/100</span>
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed mb-5 text-sm font-medium">
                    Cold email is tough in 2026. Instead of outbound, have you tried <span className="text-white bg-orange-500/20 px-1 py-0.5 rounded border border-orange-500/20">engaging in existing discussions</span>? We built a tool that automatically finds these threads...
                  </p>

                  <div className="flex gap-3">
                    <button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-900/20 hover:shadow-orange-500/30 transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                      <MessageSquare size={14} /> Post Reply
                    </button>
                    <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors border border-slate-700">Edit</button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 relative overflow-hidden bg-slate-50/50">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-20 tracking-tight">Loved by Founders</h2>

          <div className="relative min-h-[450px] flex items-center justify-center">
            {[
              { name: 'Sarah Jenkins', role: 'CTO, TechFlow', text: "I was skeptical about Reddit marketing, but this tool made it feel authentic. We got our first 100 users in a week.", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60" },
              { name: 'Mike Ross', role: 'Indie Hacker', text: "The AI replies are actually good. They don't sound robotic. It's like having a co-founder handling support 24/7.", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60" },
              { name: 'David Chen', role: 'Founder, SaaSI', text: "Finally, a tool that respects Reddit's culture while helping businesses grow. Absolute game changer for us.", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60" }
            ].map((t, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-700 ease-out transform
                    ${index === activeTestimonial ? 'opacity-100 translate-x-0 scale-100 blur-0' : 'opacity-0 translate-x-12 scale-95 blur-sm pointer-events-none'}
                  `}
              >
                <div className="bg-white p-12 md:p-16 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 max-w-3xl mx-auto relative overflow-hidden">
                  {/* Quote Icon */}
                  <div className="absolute -top-6 -left-6 text-orange-50">
                    <MessageSquare size={120} fill="currentColor" className="opacity-80" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex gap-1 text-orange-400 mb-8 justify-center">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={24} fill="currentColor" />)}
                    </div>

                    <blockquote className="text-2xl md:text-3xl font-medium text-slate-800 leading-relaxed mb-10 font-heading">
                      "{t.text}"
                    </blockquote>

                    <div className="flex items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-100 shadow-md">
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900 text-lg">{t.name}</div>
                        <div className="text-orange-600 font-medium text-sm">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-3 mt-4">
            {[0, 1, 2].map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`h-3 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'bg-slate-900 w-12 shadow-lg shadow-slate-400/50' : 'bg-slate-300 w-3 hover:bg-slate-400'}`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="absolute top-0 w-full h-px bg-slate-200"></div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-6">
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2">
              <Star size={12} fill="currentColor" /> Simple Pricing
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Pay as you <span className="text-orange-600">grow.</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Start for free, upgrade when you see results. No hidden fees.
            </p>

            {/* Billing Toggle (Premium Design) */}
            <div className="flex items-center justify-center gap-4 mt-12 bg-white/50 backdrop-blur-sm border border-slate-200/50 p-2 rounded-3xl w-fit mx-auto shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Monthly
              </button>
              <div className="relative">
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Yearly
                </button>
                {plans.length > 0 && (() => {
                  const discounts = plans
                    .filter((p: any) => p.monthlyPrice > 0 && p.yearlyPrice > 0)
                    .map((p: any) => Math.round(100 - (p.yearlyPrice / (p.monthlyPrice * 12) * 100)));
                  const maxDiscount = Math.max(...discounts, 0);

                  return maxDiscount > 0 ? (
                    <span className="absolute -top-6 -right-12 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md animate-bounce whitespace-nowrap">
                      SAVE UP TO {maxDiscount}%
                    </span>
                  ) : null;
                })()}
              </div>

            </div>


          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto items-stretch">
            {plans.filter((p: any) => p.isVisible !== false).map((plan: any) => {
              const theme = plan.isPopular ? 'orange' : (plan.name === 'Agency' ? 'slate' : 'slate');
              const isFree = plan.monthlyPrice === 0;

              // Only show yearly if selected, not free, and a yearly price exists
              const isYearlySelected = billingCycle === 'yearly' && !isFree && (plan.yearlyPrice || 0) > 0;
              const price = isYearlySelected ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              const credits = isYearlySelected ? plan.credits * 12 : plan.credits;
              const dailyLimit = isYearlySelected ? plan.dailyLimitYearly : plan.dailyLimitMonthly;

              // Calculate actual discount percentage to show on the badge if needed
              const actualDiscount = (plan.monthlyPrice > 0 && plan.yearlyPrice > 0)
                ? Math.round(100 - (plan.yearlyPrice / (plan.monthlyPrice * 12) * 100))
                : 0;



              return (
                <div key={plan.id} className={`bg-white rounded-[2.5rem] p-10 border ${plan.isPopular ? 'border-orange-200 shadow-2xl shadow-orange-100/50 scale-105 z-10' : 'border-slate-100 shadow-lg'} hover:-translate-y-2 transition-all duration-500 relative overflow-hidden flex flex-col ${plan.purchaseEnabled === false ? 'opacity-80 grayscale-[0.2]' : ''}`}>
                  {plan.isPopular && (
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-50 rounded-bl-[160px] -mr-12 -mt-12 pointer-events-none transition-transform hover:scale-110"></div>
                  )}

                  {plan.isPopular && (
                    <div className="absolute top-6 right-6 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                      Most Popular
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="mb-8">
                      <div className="flex flex-col gap-2">
                        {!isFree && plan.purchaseEnabled === false && (
                          <span className="bg-orange-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit mb-1 shadow-sm shadow-orange-100">
                            Reached Capacity
                          </span>
                        )}
                        <span className={`font-black uppercase tracking-widest text-[10px] px-3 py-1 rounded-full w-fit ${plan.isPopular ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'}`}>{plan.name}</span>
                        {isYearlySelected && actualDiscount > 0 && (
                          <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded-lg w-fit">
                            SAVE {actualDiscount}%
                          </span>
                        )}
                      </div>


                      <div className="mt-6">
                        <div className="flex items-baseline gap-2">
                          {isFree ? (
                            <span className="text-6xl font-black text-slate-900 tracking-tight">Free</span>
                          ) : (
                            <div className="flex flex-col">
                              {isYearlySelected && (
                                <span className="text-xl font-bold text-slate-300 line-through mb-[-8px] ml-1">${plan.monthlyPrice}</span>
                              )}
                              <div className="flex items-baseline gap-1">
                                <span className="text-6xl font-black text-slate-900 tracking-tight">${price}</span>
                                <span className="text-slate-400 font-bold text-lg">/mo</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {billingCycle === 'yearly' && !isFree && plan.yearlyPrice > 0 && (
                        <p className="text-green-600 text-xs font-black mt-2 bg-green-50 px-2 py-1 rounded-lg w-fit">
                          Billed ${plan.yearlyPrice} annually
                        </p>
                      )}
                      <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
                        {plan.description || (
                          plan.name?.toLowerCase() === 'starter' ? 'Perfect for individuals exploring AI replies.' :
                            plan.name?.toLowerCase() === 'professional' ? 'Perfect for indie hackers and solo founders.' :
                              'For serious growth and small teams.'
                        )}
                      </p>
                    </div>

                    <ul className="space-y-4 mb-10 flex-1">
                      <li className="flex items-center gap-3.5 text-sm font-black text-slate-900 border-b border-slate-50 pb-2">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                          <Zap size={14} fill={plan.isPopular ? "currentColor" : "none"} strokeWidth={3} />
                        </div>
                        {credits.toLocaleString()} AI Actions {isYearlySelected ? 'Upfront' : '/mo'}
                      </li>

                      <li className="flex items-center gap-3.5 text-sm font-bold text-slate-700">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                          <Star size={14} fill={plan.isPopular ? "currentColor" : "none"} strokeWidth={3} />
                        </div>
                        {dailyLimit || 0} Actions / day
                      </li>

                      {/* Dynamic Feature Toggles */}
                      <li className="flex items-center gap-3.5 text-sm font-medium text-slate-700">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${plan.maxAccounts > 1 ? (plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600') : 'bg-slate-50 text-slate-300'}`}>
                          {plan.maxAccounts > 1 ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                        </div>
                        <span className={plan.maxAccounts > 1 ? '' : 'text-slate-400'}>
                          {plan.maxAccounts >= 100 ? 'Unlimited Accounts' : plan.maxAccounts > 1 ? `Up to ${plan.maxAccounts} Accounts` : 'Multiple Accounts Support'}
                        </span>
                      </li>

                      <li className="flex items-center gap-3.5 text-sm font-medium text-slate-700">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${plan.allowImages ? (plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600') : 'bg-slate-50 text-slate-300'}`}>
                          {plan.allowImages ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                        </div>
                        <span className={plan.allowImages ? '' : 'text-slate-400'}>
                          AI Image Generation
                        </span>
                      </li>

                      <li className="flex items-center gap-3.5 text-sm font-medium text-slate-700">
                        <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${plan.allowTracking ? (plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600') : 'bg-slate-50 text-slate-300'}`}>
                          {plan.allowTracking ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                        </div>
                        <span className={plan.allowTracking ? '' : 'text-slate-400'}>
                          Advanced Link Tracking
                        </span>
                      </li>

                      {/* Custom Decorative Features */}
                      {plan.features.map((f: string, i: number) => (
                        <li key={i} className="flex items-center gap-3.5 text-sm font-medium text-slate-500">
                          <div className={`w-6 h-6 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${plan.isPopular ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                            <CheckCircle2 size={14} strokeWidth={3} />
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={plan.purchaseEnabled !== false ? "/signup" : "#"}
                      onClick={(e) => plan.purchaseEnabled === false && e.preventDefault()}
                      className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-center block ${plan.purchaseEnabled === false
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                        : plan.isPopular
                          ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-orange-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                      {plan.purchaseEnabled === false ? 'Capacity Reached' : plan.monthlyPrice === 0 ? 'Start Free' : 'Choose Plan'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-orange-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-orange-200">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            <div className="relative z-10 max-w-3xl mx-auto space-y-8">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Stop scrolling Reddit. <br />
                Let your AI agent do the work.
              </h2>
              <p className="text-orange-100 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
                Set up once. Your agent comments, posts, and grows your presence every single day.
              </p>

              <div className="flex flex-col items-center pt-4">
                <Link to="/signup" className="px-10 py-5 bg-white text-orange-600 rounded-full font-bold text-lg hover:bg-orange-50 hover:scale-105 transition-all shadow-xl shadow-orange-900/10 mb-6">
                  Activate Your AI Agent
                </Link>
                <p className="text-orange-200 text-sm font-bold tracking-wide">
                  Free to start • No credit card required
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 bg-white text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-6">
          <div className="text-sm font-medium">
            © 2026 RedditGo AI. All rights reserved.
          </div>
          <div className="flex items-center gap-8 text-sm font-medium">
            <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
