import { useState, useEffect } from 'react';
import FadeInSection from '../../components/ui/FadeInSection';

const APP_ICON = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png';

export default function AboutPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const features = [
    { title: 'Posts', sub: 'Share your thoughts', desc: 'Write what is on your mind. React to what others say. Start real conversations.' },
    { title: 'Louda', sub: 'Private messaging', desc: 'Send messages to friends and groups. Fast, private, and always there.' },
    { title: 'Go Live', sub: 'Real-time video', desc: 'Start a live stream and connect with your audience instantly.' },
    { title: 'Snaps', sub: 'Short-form video', desc: 'Post quick videos that reach people beyond your following.' },
    { title: 'Mobcoins', sub: 'In-app currency', desc: 'Earn coins by being active. Send gifts, boost posts, and reward content.' },
    { title: 'Hall of Fame', sub: 'Weekly leaderboard', desc: 'The most active Textmobbers get ranked weekly.' },
    { title: 'Connections', sub: 'Your network', desc: 'Add friends, follow creators, and build your circle.' },
    { title: 'Textmob AI', sub: 'Smart companion', desc: 'Ask anything, get help with ideas, search the web without leaving.' },
  ];

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'About', href: '#about' },
  ];

  return (
    <div className="bg-white text-gray-900 font-sans antialiased">
      {/* Header */}
      <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/95 border-b border-gray-100' : 'bg-transparent'}`} style={{ backdropFilter: scrolled ? 'blur(12px)' : 'none' }}>
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src={APP_ICON} alt="Textmob" className="w-8 h-8 rounded-xl" />
            <span className="text-base font-black text-gray-900 tracking-tight">Textmob</span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(l => <a key={l.label} href={l.href} className="px-3 py-2 rounded-xl text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">{l.label}</a>)}
            <a href="https://textmob.web.app" className="ml-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-[0.97] transition-colors">Open App</a>
          </nav>
          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-1">
            {navLinks.map(l => <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">{l.label}</a>)}
            <a href="https://textmob.web.app" className="block px-3 py-2.5 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors">Open App</a>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="min-h-screen flex items-center pt-16 bg-white">
          <div className="max-w-6xl mx-auto px-5 py-20 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-3 py-1.5 mb-6">
                  <span className="w-2 h-2 bg-blue-600 rounded-full" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Africa's Social Network</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight mb-6">
                  Text freely.<br /><span className="text-blue-600">Connect deeply.</span>
                </h1>
                <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                  Textmob is where real conversations happen. Post your thoughts, message your people, go live, and earn as you engage.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href="https://textmob.web.app" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 active:scale-[0.97] transition-colors">
                    Get Started, It's Free
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                  </a>
                  <a href="https://textmob-provider-api-99ii.onrender.com/app" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-2xl hover:bg-gray-50 active:scale-[0.97] transition-colors">
                    Download Android App
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="py-24 bg-gray-50">
          <div className="max-w-5xl mx-auto px-5">
            <FadeInSection>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Our Mission</p>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-5">Built for Africa.<br />Built for realness.</h2>
                  <p className="text-gray-500 leading-relaxed mb-4">Textmob was created with one belief: that social media should reflect who we actually are.</p>
                  <p className="text-gray-500 leading-relaxed">From Lagos to Nairobi, Accra to Dakar, Textmob is the space for African voices.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: 'Real conversations', icon: '\u{1F4AC}', color: 'bg-blue-50 border-blue-100' }, { label: 'Privacy first', icon: '\u{1F512}', color: 'bg-green-50 border-green-100' }, { label: 'African perspective', icon: '\u{1F30D}', color: 'bg-orange-50 border-orange-100' }, { label: 'Rewarding engagement', icon: '\u{1FA99}', color: 'bg-yellow-50 border-yellow-100' }].map((item, i) => (
                    <div key={i} className={`${item.color} border rounded-2xl p-4 flex flex-col gap-2`}>
                      <span className="text-2xl">{item.icon}</span>
                      <p className="text-sm font-bold text-gray-800 leading-tight">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-5">
            <FadeInSection className="text-center mb-14">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Everything in one place</h2>
              <p className="text-gray-500 max-w-lg mx-auto">Textmob brings together the features that matter.</p>
            </FadeInSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <FadeInSection delay={i * 40} key={i}>
                  <div className="group border border-gray-100 rounded-2xl p-5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                    <p className="text-sm font-black text-gray-900 mb-0.5">{f.title}</p>
                    <p className="text-xs text-blue-600 font-semibold mb-2">{f.sub}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-5">
            <FadeInSection className="text-center mb-14">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Getting started</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Three steps. That's it.</h2>
            </FadeInSection>
            <div className="space-y-6">
              {[{ num: '01', title: 'Create your account', desc: 'Sign up with your email or phone. Add your photo, write your bio.' }, { num: '02', title: 'Build your circle', desc: 'Find people you know. Connect with friends and follow voices you respect.' }, { num: '03', title: 'Show up and engage', desc: 'Post, comment, go live, earn Mobcoins. The more real you are, the more you get.' }].map((step, i) => (
                <FadeInSection delay={i * 80} key={i}>
                  <div className="flex items-start gap-6 bg-white border border-gray-100 rounded-2xl p-6">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black flex-shrink-0">{step.num}</div>
                    <div>
                      <p className="text-base font-black text-gray-900 mb-1">{step.title}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-blue-600">
          <FadeInSection className="max-w-4xl mx-auto px-5 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">Ready to join Textmob?</h2>
            <p className="text-blue-200 text-lg mb-8 max-w-lg mx-auto">Connect with real people. Share your real life. Earn from real engagement.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="https://textmob.web.app" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-white text-blue-600 text-sm font-black rounded-2xl hover:bg-blue-50 active:scale-[0.97] transition-colors">Get Started, Web</a>
              <a href="https://textmob-provider-api-99ii.onrender.com/app" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-blue-700 text-white text-sm font-semibold rounded-2xl hover:bg-blue-800 active:scale-[0.97] transition-colors border border-blue-500">Download Android App</a>
            </div>
          </FadeInSection>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-5 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={APP_ICON} alt="" className="w-8 h-8 rounded-xl" />
                <span className="text-white font-black text-base">Textmob</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">Africa's social network. Built for real conversations, real connections, and real communities.</p>
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Platform</p>
              <ul className="space-y-2.5 text-sm">
                {['Features', 'How It Works', 'About'].map(l => <li key={l}><a href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
            <div>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">Legal</p>
              <ul className="space-y-2.5 text-sm">
                <li><a href="mailto:sharpbrainspublishers@gmail.com" className="text-white transition-colors">Contact</a></li>
                <li><a href="mailto:gidadoismail24@gmail.com" className="text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <p>&copy; {new Date().getFullYear()} Textmob. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
