import { useState, useEffect, useRef } from 'react';
import { apiFetch, getCurrentUser } from '../config/api';
import { cn } from '../utils/classNames';
import BottomSheet from '../components/ui/BottomSheet';
import SkeletonRow from '../components/ui/SkeletonRow';
import NavIcons from '../utils/navIcons';
import RichText from '../components/ui/RichText';
import AutocompleteDropdown from '../components/layout/AutocompleteDropdown';

// SVG Icons from oldacc.jsx + NavIcons
const K = {
    Home: <NavIcons.Home className="w-5 h-5" />,
    Profile: <NavIcons.User className="w-5 h-5" />,
    Posts: <NavIcons.Menu className="w-5 h-5" />,
    Snaps: <NavIcons.Snaps className="w-5 h-5" />,
    Chart: <NavIcons.AiChat className="w-5 h-5" />,
    Grow: <NavIcons.Bolt className="w-5 h-5" />,
    Prefs: <NavIcons.Cog className="w-5 h-5" />,
    Danger: <NavIcons.ArrowRightOnRect className="w-5 h-5" />,
    Coin: <NavIcons.Wallet className="w-4 h-4" />,
    Crown: <NavIcons.Leaderboard className="w-4 h-4" />,
    Edit: <NavIcons.Edit className="w-4 h-4" />,
    Trash: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
        </svg>
    ),
    Link: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    ),
    Check: <NavIcons.Verified className="w-4 h-4" />,
    Info: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    Plus: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
    ),
    Eye: <NavIcons.Search className="w-4 h-4" />,
    EyeOff: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ),
    Lock: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
    ),
    Phone: <NavIcons.Camera className="w-4 h-4" />, // Placeholder if missing
    Mail: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
        </svg>
    ),
};

const Xt = [
    {
        section: 'Dashboard', items: [
            { key: 'home', label: 'Overview', icon: K.Home },
            { key: 'monetize', label: 'Monetization', icon: K.Coin },
            { key: 'analytics', label: 'Analytics', icon: K.Chart },
        ]
    },
    {
        section: 'Content', items: [
            { key: 'composer', label: 'New Post', icon: K.Plus },
            { key: 'posts', label: 'Manage Posts', icon: K.Posts },
            { key: 'snaps', label: 'Snaps Studio', icon: K.Snaps },
        ]
    },
    {
        section: 'Growth', items: [
            { key: 'grow', label: 'Milestones', icon: K.Grow },
            { key: 'leaderboard', label: 'Hall of Fame', icon: K.Crown },
        ]
    },
    {
        section: 'Settings', items: [
            { key: 'profile', label: 'Edit Profile', icon: K.Profile },
            { key: 'prefs', label: 'Preferences', icon: K.Prefs },
            { key: 'danger', label: 'Logout', icon: K.Danger },
        ]
    },
];

// Shared UI Components
function Accordion({ title, children, icon, description }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-3">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">{icon}</div>
                    <div>
                        <p className="text-sm font-black text-gray-900">{title}</p>
                        {description && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{description}</p>}
                    </div>
                </div>
                <svg viewBox="0 0 24 24" className={cn("w-4 h-4 text-gray-400 transition-transform", open ? "rotate-180" : "")} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {open && <div className="p-5 border-t border-gray-50 bg-white">{children}</div>}
        </div>
    );
}

function Yt({ msg }) {
    if (!msg) return null;
    return (
        <div className={cn('flex items-center gap-2 text-[11px] px-4 py-2.5 rounded-xl font-black uppercase tracking-wider', msg.ok ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100')}>
            {msg.ok ? <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> : <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
            {msg.text}
        </div>
    );
}

function Wt({ onClick }) {
    return (
        <button onClick={onClick} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
    );
}

function Gt({ onClose }) { return <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />; }

function ToolbarBtn({ onClick, icon, title, active = false }) {
    return (
        <button onClick={(e) => { e.preventDefault(); onClick(); }} title={title} className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all active:scale-95", active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent hover:border-gray-100")}>
            {icon}
        </button>
    );
}

// Main Component
export default function AccountsCenter() {
    const [activeTab, setActiveTab] = useState('home');
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const username = getCurrentUser();

    useEffect(() => {
        async function load() {
            const [p, t, s] = await Promise.allSettled([
                apiFetch(`/profile/${username}`),
                apiFetch(`/get-user-posts?username=${encodeURIComponent(username)}`),
                apiFetch(`/account-stats?username=${encodeURIComponent(username)}`),
            ]);
            if (p.status === 'fulfilled' && p.value.ok) setProfile(await p.value.json());
            if (t.status === 'fulfilled' && t.value.ok) setPosts(await t.value.json());
            if (s.status === 'fulfilled' && s.value.ok) setStats(await s.value.json());
            setLoading(false);
        }
        load();
    }, [username]);

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-full max-w-md p-4 space-y-4"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div></div>;

    const defaultPic = 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg';
    const isOrg = (profile?.profile_type || '').toLowerCase() !== 'individual';

    const renderNavItems = (onItemClick) => (
        Xt.map((section, sIdx) => (
            <div key={sIdx} className="mb-5 px-3">
                <p className="px-3 mb-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">{section.section}</p>
                <div className="space-y-1">
                    {section.items.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); if (onItemClick) onItemClick(); }}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all active:scale-[0.98]',
                                activeTab === tab.key ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                            )}
                        >
                            <span className={activeTab === tab.key ? 'text-white' : 'text-gray-400'}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        ))
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 h-screen sticky top-0">
                <div className={cn('p-5 border-b border-gray-100 flex items-center gap-3', isOrg ? 'bg-gradient-to-br from-blue-50 to-purple-50' : '')}>
                    <img src={profile?.profile_pic || defaultPic} className="w-12 h-12 rounded-[1.25rem] object-cover border-2 border-white shadow-sm" />
                    <div className="min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate leading-none mb-1">{profile?.fullname || username}</p>
                        <p className="text-[10px] text-gray-400 font-bold">@{username}</p>
                    </div>
                </div>
                <nav className="flex-1 py-6 overflow-y-auto">{renderNavItems()}</nav>
            </aside>

            {sidebarOpen && (
                <>
                    <Gt onClose={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col lg:hidden border-r border-gray-100 animate-in slide-in-from-left duration-300">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={profile?.profile_pic || defaultPic} className="w-10 h-10 rounded-xl object-cover" />
                                <p className="text-sm font-black">@{username}</p>
                            </div>
                            <Wt onClick={() => setSidebarOpen(false)} />
                        </div>
                        <nav className="flex-1 py-6 overflow-y-auto">{renderNavItems(() => setSidebarOpen(false))}</nav>
                    </div>
                </>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-5 h-16 flex items-center justify-between">
                    <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 bg-gray-50">
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">{activeTab}</p>
                    <img src={profile?.profile_pic || defaultPic} className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm" />
                </header>

                <main className="flex-1 overflow-y-auto p-5 lg:p-10 max-w-5xl w-full mx-auto">
                    {activeTab === 'home' && <OverviewTab profile={profile} stats={stats} posts={posts} setTab={setActiveTab} isOrg={isOrg} />}
                    {activeTab === 'monetize' && <MonetizationTab username={username} stats={stats} />}
                    {activeTab === 'analytics' && <AnalyticsTab posts={posts} isOrg={isOrg} />}
                    {activeTab === 'composer' && <ComposerTab username={username} setTab={setActiveTab} />}
                    {activeTab === 'profile' && <EditProfileTab profile={profile} setProfile={setProfile} username={username} isOrg={isOrg} />}
                    {activeTab === 'posts' && <PostsTab posts={posts} setPosts={setPosts} setTab={setActiveTab} />}
                    {activeTab === 'snaps' && <SnapsTab posts={posts} setPosts={setPosts} setTab={setActiveTab} username={username} />}
                    {activeTab === 'grow' && <GrowTab stats={stats} profile={profile} setTab={setActiveTab} isOrg={isOrg} />}
                    {activeTab === 'prefs' && <PrefsTab profile={profile} setProfile={setProfile} />}
                    {activeTab === 'danger' && <DangerTab username={username} />}
                    {activeTab === 'leaderboard' && <div className="py-20 text-center"><div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-gray-200 mx-auto mb-4">{K.Crown}</div><p className="text-sm font-black text-gray-400 uppercase tracking-widest">Global Rankings Coming Soon</p></div>}
                </main>
            </div>
        </div>
    );
}

// 1. OverviewTab
function OverviewTab({ profile, stats, posts, setTab, isOrg }) {
    const followers = (profile?.followers || []).length;
    const balance = stats?.mobcoins || 0;
    const ngnValue = (balance * 0.1).toLocaleString();
    const interactions = posts.reduce((acc, p) => acc + (p.likes?.length || 0) + (p.comments?.length || 0), 0);
    const avgInteractions = posts.length ? (interactions / posts.length).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-black text-gray-900 leading-none">Creator Dashboard</h2><p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-2">Real-time performance metrics</p></div>
                <button onClick={() => window.Lexum?.navigate('/')} className="px-5 py-2.5 rounded-2xl bg-white border border-gray-100 text-[10px] font-black text-gray-500 hover:text-gray-900 shadow-sm transition-all active:scale-95 uppercase tracking-widest">Home Feed</button>
            </div>

            <div className={cn('rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl', isOrg ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800' : 'bg-gradient-to-br from-blue-600 to-blue-800')}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="flex items-center gap-5 mb-10 relative">
                    <img src={profile?.profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg'} className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-white/20 shadow-lg" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-black leading-none truncate">{profile?.fullname || 'Creator'}</h3>
                            {isOrg && <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-widest">PRO</span>}
                        </div>
                        <p className="text-sm text-blue-100 font-bold opacity-70">@{profile?.username || 'user'}</p>
                    </div>
                    <div className="text-right"><p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">Status</p><p className="text-lg font-black">{avgInteractions > 5 ? 'Established' : 'Growth'}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-6 relative">
                    <div className="bg-white/10 rounded-[1.5rem] p-5 border border-white/5 backdrop-blur-md">
                        <p className="text-[10px] font-black uppercase text-blue-200 mb-2">Followers</p>
                        <p className="text-2xl font-black">{followers.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 rounded-[1.5rem] p-5 border border-white/5 backdrop-blur-md">
                        <p className="text-[10px] font-black uppercase text-blue-200 mb-2">Balance</p>
                        <p className="text-2xl font-black">₦{ngnValue}</p>
                    </div>
                    <div className="bg-white/10 rounded-[1.5rem] p-5 border border-white/5 backdrop-blur-md">
                        <p className="text-[10px] font-black uppercase text-blue-200 mb-2">Reach</p>
                        <p className="text-2xl font-black">{interactions.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction label="New Post" icon={K.Plus} onClick={() => setTab('composer')} color="text-blue-600 bg-blue-50" />
                <QuickAction label="Cash Out" icon={K.Coin} onClick={() => setTab('monetize')} color="text-emerald-600 bg-emerald-50" />
                <QuickAction label="Detailed Info" icon={K.Chart} onClick={() => setTab('analytics')} color="text-purple-600 bg-purple-50" />
                <QuickAction label="Edit Brand" icon={K.Profile} onClick={() => setTab('profile')} color="text-orange-600 bg-orange-50" />
            </div>
        </div>
    );
}

function QuickAction({ label, icon, onClick, color }) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-3 p-5 rounded-[2rem] bg-white border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-600/5 transition-all active:scale-95 text-center">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", color)}>{icon}</div>
            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{label}</p>
        </button>
    );
}

// 2. MonetizationTab
function MonetizationTab({ username, stats }) {
    const [balance, setBalance] = useState(stats?.mobcoins || 0);
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRedeem, setShowRedeem] = useState(false);
    const [redeemType, setRedeemType] = useState('CASH');
    const [redeemAmount, setRedeemAmount] = useState('');
    const [details, setDetails] = useState({ bank: '', account_no: '', name: '', network: 'MTN', phone: '' });
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function load() {
            const res = await apiFetch(`/api/user/payouts?userId=${encodeURIComponent(username)}`);
            if (res.ok) setPayouts(await res.json());
            setLoading(false);
        }
        load();
    }, [username]);

    const handleRedeem = async () => {
        const amount = Number(redeemAmount);
        if (amount < 2000) return setStatus({ ok: false, text: 'Minimum 2,000 Mobcoins' });
        if (amount > balance) return setStatus({ ok: false, text: 'Insufficient balance' });
        setSubmitting(true);
        try {
            const res = await apiFetch('/api/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: username, amount, type: redeemType, details: redeemType === 'CASH' ? { bank: details.bank, account_no: details.account_no, name: details.name } : { network: details.network, phone: details.phone } })
            });
            const data = await res.json();
            if (res.ok) { setStatus({ ok: true, text: 'Request Successful!' }); setBalance(prev => prev - amount); setTimeout(() => setShowRedeem(false), 2000); }
            else throw new Error(data.error || 'Redemption failed');
        } catch (err) { setStatus({ ok: false, text: err.message }); } finally { setSubmitting(false); }
    };

    return (
        <div className="space-y-5 pb-20">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-2">Monetized Earnings</p>
                <p className="text-5xl font-black mb-2">₦{(balance * 0.1).toLocaleString()}</p>
                <p className="text-sm text-emerald-100 font-bold opacity-80">{balance.toLocaleString()} Mobcoins Generated</p>
                <div className="mt-8 flex gap-3">
                    <button disabled={balance < 2000} onClick={() => setShowRedeem(true)} className="flex-1 h-14 bg-white text-emerald-700 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-40 shadow-lg">Cash Out Now</button>
                    <div className="flex-1 px-5 flex flex-col justify-center border-l border-white/10"><p className="text-[10px] font-black uppercase text-emerald-100 mb-1">Standard Rate</p><p className="text-sm font-black">1 Coin = ₦0.10</p></div>
                </div>
            </div>

            <Accordion title="Revenue Guidelines" icon={<span className="text-2xl">💰</span>} description="How to maximize earnings">
                <div className="grid gap-4 p-1">
                    {[
                        { t: 'High Interaction', b: 'Content with high likes and comments generates coins 50% faster.' },
                        { t: 'Reach 2K Goal', b: 'A minimum of 2,000 coins is required to trigger a bank payout.' },
                        { t: 'Pro Mode Advantage', b: 'Professional accounts get early access to ad revenue sharing.' }
                    ].map(i => <div key={i.t} className="flex gap-4"><div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" /><div><p className="text-sm font-black text-gray-900">{i.t}</p><p className="text-xs text-gray-500 mt-1 leading-relaxed">{i.b}</p></div></div>)}
                </div>
            </Accordion>

            <Accordion title="Payout Archive" icon={K.Link} description="Review previous transactions">
                {loading ? <SkeletonRow /> : payouts.length === 0 ? <div className="py-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">No transaction history discovered</div> : (
                    <div className="space-y-3">
                        {payouts.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                <div><p className="text-sm font-black text-gray-900 uppercase tracking-tight">{p.type === 'CASH' ? 'Bank Wire' : 'Airtime'}</p><p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">{new Date(p.created_at).toLocaleString()}</p></div>
                                <div className="text-right"><p className="text-sm font-black text-gray-900 leading-none mb-1">₦{Number(p.naira_value).toLocaleString()}</p><span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter", p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{p.status}</span></div>
                            </div>
                        ))}
                    </div>
                )}
            </Accordion>

            <BottomSheet open={showRedeem} onClose={() => setShowRedeem(false)} title="Payout Request" wide>
                <div className="p-6 space-y-6 pb-12">
                    <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
                        <button onClick={() => setRedeemType('CASH')} className={cn("flex-1 h-11 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest", redeemType === 'CASH' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400")}>Bank Deposit</button>
                        <button onClick={() => setRedeemType('AIRTIME')} className={cn("flex-1 h-11 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest", redeemType === 'AIRTIME' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400")}>Airtime Credit</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Amount to Redeem (Coins)</label>
                            <input type="number" value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} placeholder="Minimum 2000" className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-base font-black outline-none focus:ring-4 focus:ring-emerald-50 focus:bg-white transition-all" />
                            <p className="text-[10px] font-black text-emerald-600 mt-3 ml-1 uppercase tracking-widest">Naira Value: ₦{Number(redeemAmount * 0.1).toLocaleString()}</p>
                        </div>
                        {redeemType === 'CASH' ? (
                            <div className="grid gap-3">
                                <input type="text" placeholder="Financial Institution" value={details.bank} onChange={e => setDetails({ ...details, bank: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-bold outline-none focus:bg-white" />
                                <input type="text" placeholder="Account Identifier" value={details.account_no} onChange={e => setDetails({ ...details, account_no: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-bold outline-none focus:bg-white" />
                                <input type="text" placeholder="Account Legal Name" value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-bold outline-none focus:bg-white" />
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <select value={details.network} onChange={e => setDetails({ ...details, network: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-black outline-none focus:bg-white uppercase tracking-widest"><option>MTN NIGERIA</option><option>AIRTEL</option><option>GLO MOBILE</option><option>9MOBILE</option></select>
                                <input type="tel" placeholder="Phone Recipient" value={details.phone} onChange={e => setDetails({ ...details, phone: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-bold outline-none focus:bg-white" />
                            </div>
                        )}
                    </div>
                    <Yt msg={status} />
                    <button onClick={handleRedeem} disabled={submitting || !redeemAmount} className="w-full h-16 bg-emerald-600 text-white rounded-[1.5rem] text-sm font-black active:scale-95 transition-all disabled:opacity-40 shadow-2xl shadow-emerald-600/20 uppercase tracking-widest">{submitting ? 'Verifying...' : 'Submit Payout'}</button>
                </div>
            </BottomSheet>
        </div>
    );
}

// 3. AnalyticsTab
function AnalyticsTab({ posts, isOrg }) {
    const chartRef1 = useRef(null);
    const chartRef2 = useRef(null);
    const chartRef3 = useRef(null);
    const likes = posts.reduce((acc, p) => acc + (p.likes?.length || 0), 0);
    const comments = posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.Chart || !isOrg) return;
        const ChartClass = window.Chart;
        const ctx1 = chartRef1.current?.getContext('2d');
        const ctx2 = chartRef2.current?.getContext('2d');
        const ctx3 = chartRef3.current?.getContext('2d');
        if (!ctx1 || !ctx2 || !ctx3) return;

        const config = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
        const charts = [
            new ChartClass(ctx1, { type: 'bar', data: { labels: ['Likes', 'Comments'], datasets: [{ data: [likes, comments], backgroundColor: ['#3b82f6', '#10b981'], borderRadius: 12 }] }, options: { ...config, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } } } }),
            new ChartClass(ctx2, { type: 'doughnut', data: { labels: ['Posts', 'Remaining'], datasets: [{ data: [posts.length, 100], backgroundColor: ['#8b5cf6', '#f1f5f9'], borderWidth: 0, cutout: '82%' }] }, options: config }),
            new ChartClass(ctx3, { type: 'line', data: { labels: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], datasets: [{ data: [10, 25, 15, 30, 45, 20, 55], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', tension: 0.4, fill: true, pointRadius: 0 }] }, options: { ...config, scales: { x: { display: false }, y: { display: false } } } })
        ];
        return () => charts.forEach(c => c.destroy());
    }, [posts, likes, comments, isOrg]);

    if (!isOrg) return <div className="py-24 text-center space-y-5 px-5"><div className="w-20 h-20 rounded-[2rem] bg-purple-50 flex items-center justify-center text-3xl mx-auto shadow-sm">📊</div><h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Professional Insights Locked</h2><p className="text-sm text-gray-400 font-bold leading-relaxed max-w-xs mx-auto">Switch to an Organisation profile to unlock engagement charts, monthly trends, and viral analytics.</p></div>;

    return (
        <div className="space-y-5 pb-20">
            <div className="mb-8 px-1">
                <h2 className="text-2xl font-black text-gray-900 leading-none mb-2">Growth Analytics</h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">Data-driven performance tracking</p>
            </div>

            <Accordion title="Interaction Density" icon={<NavIcons.AiChat className="w-5 h-5" />} description="Reach and engagement breakdown">
                <div className="space-y-6">
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">This metric tracks your total content pull. High interaction volume directly accelerates your <strong>Revenue generation</strong>.</p>
                    <div className="h-56"><canvas ref={chartRef1} /></div>
                    <div className="grid grid-cols-2 gap-4"><div className="p-5 rounded-[1.5rem] bg-blue-50 border border-blue-100 text-center"><p className="text-2xl font-black text-blue-700">{likes}</p><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Total Likes</p></div><div className="p-5 rounded-[1.5rem] bg-emerald-50 border border-emerald-100 text-center"><p className="text-2xl font-black text-emerald-700">{comments}</p><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1">Total Comments</p></div></div>
                </div>
            </Accordion>

            <Accordion title="Verified Roadmap" icon={<NavIcons.Verified className="w-5 h-5" />} description="Progress to verified status">
                <div className="space-y-6">
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">Reach 100 quality publications to automatically trigger an account review for the <strong>Verified Blue Badge</strong>.</p>
                    <div className="flex justify-center h-56 relative"><canvas ref={chartRef2} /><div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><p className="text-4xl font-black text-gray-900 leading-none">{posts.length}</p><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Publications</p></div></div>
                    <p className="text-center text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 py-3 rounded-xl border border-gray-100">{100 - posts.length} Publications Remaining</p>
                </div>
            </Accordion>

            <Accordion title="Viral Velocity" icon={<NavIcons.Bolt className="w-5 h-5" />} description="Recent interaction momentum">
                <div className="space-y-6">
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">Visualizing your engagement peaks over the last 7 days. Sudden spikes indicate content going viral.</p>
                    <div className="h-56 w-full"><canvas ref={chartRef3} /></div>
                </div>
            </Accordion>
        </div>
    );
}

// 4. ComposerTab
function ComposerTab({ username, setTab }) {
    const [content, setContent] = useState('');
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFeelings, setShowFeelings] = useState(false);
    const [feeling, setFeeling] = useState(null);
    const [showPoll, setShowPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState([{ text: '' }, { text: '' }]);
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionActiveIdx, setSuggestionActiveIdx] = useState(0);
    const [suggestionCtx, setSuggestionCtx] = useState(null);
    const editorRef = useRef(null);

    const feelings = [
        { name: 'Happy', emoji: '😊' }, { name: 'Excited', emoji: '🎉' }, { name: 'Proud', emoji: '🏆' },
        { name: 'Loved', emoji: '🥰' }, { name: 'Grateful', emoji: '🙏' }, { name: 'Inspired', emoji: '✨' }
    ];

    const exec = (cmd, val = null) => { document.execCommand(cmd, false, val); editorRef.current?.focus(); };

    const handleInput = (e) => {
        const html = e.currentTarget.innerHTML;
        setContent(html);
        const selection = window.getSelection();
        if (!selection?.focusNode) return;
        const text = selection.focusNode.textContent || '';
        const offset = selection.focusOffset;
        const lastAt = text.lastIndexOf('@', offset - 1);
        const lastHash = text.lastIndexOf('#', offset - 1);
        const startIdx = Math.max(lastAt, lastHash);
        if (startIdx === -1 || /\s/.test(text.slice(startIdx, offset))) { setSuggestions([]); setSuggestionCtx(null); return; }
        setSuggestionCtx({ symbol: text[startIdx], start: startIdx, end: offset, node: selection.focusNode, query: text.slice(startIdx, offset) });
        apiFetch(`/search-suggest?query=${encodeURIComponent(text.slice(startIdx, offset))}&currentUsername=${username}`).then(res => res.ok ? res.json() : []).then(data => { setSuggestions(data); setSuggestionActiveIdx(0); }).catch(() => setSuggestions([]));
    };

    const handleSelectSuggestion = (item) => {
        if (!suggestionCtx) return;
        const text = item.type === 'user' ? `@${item.username}` : item.query;
        const { node, start, end } = suggestionCtx;
        node.textContent = node.textContent.slice(0, start) + text + ' ' + node.textContent.slice(end);
        const range = document.createRange(); const sel = window.getSelection();
        try { range.setStart(node, Math.min(start + text.length + 1, node.textContent.length)); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); } catch { }
        setContent(editorRef.current.innerHTML); setSuggestions([]); setSuggestionCtx(null);
    };

    const handlePublish = async () => {
        const plainText = editorRef.current?.innerText.trim();
        if (!plainText && !media.length) return alert('Enter publication content');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('username', username);
            formData.append('text', editorRef.current.innerHTML);
            formData.append('parsed', editorRef.current.innerHTML);
            formData.append('visib', 'public');
            if (feeling) formData.append('activities', `${feeling.name} ${feeling.emoji}`);
            if (showPoll) {
                const valid = pollOptions.filter(o => o.text.trim());
                if (valid.length < 2) throw new Error('Poll needs 2+ choices');
                formData.append('options', JSON.stringify(valid.map(o => ({ text: o.text, votes: [] }))));
            }
            media.forEach(m => formData.append('media', m.file));
            const res = await apiFetch('/create-post', { method: 'POST', body: formData });
            if (res.ok) { editorRef.current.innerHTML = ''; setMedia([]); setFeeling(null); setShowPoll(false); setTab('posts'); }
            else { const d = await res.json(); throw new Error(d.error || 'Publishing failed'); }
        } catch (err) { alert(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-black text-gray-900 leading-none">New Publication</h2><p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-2">Crafting professional content</p></div>
                <button onClick={handlePublish} disabled={loading} className="h-12 px-8 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-40">{loading ? 'Publishing...' : 'Publish'}</button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex flex-wrap gap-2">
                    <ToolbarBtn onClick={() => exec('bold')} icon={<span className="font-bold text-sm">B</span>} title="Bold" />
                    <ToolbarBtn onClick={() => exec('italic')} icon={<span className="italic text-sm font-serif">I</span>} title="Italic" />
                    <ToolbarBtn onClick={() => exec('insertUnorderedList')} icon="•" title="Bullet List" />
                    <div className="w-px h-6 bg-gray-200 mx-1.5 self-center" />
                    <ToolbarBtn onClick={() => setShowFeelings(!showFeelings)} icon={feeling ? feeling.emoji : "😊"} active={!!feeling} title="Activities" />
                    <ToolbarBtn onClick={() => setShowPoll(!showPoll)} icon={<NavIcons.AiChat className="w-4 h-4" />} active={showPoll} title="Polling" />
                </div>
                <div className="relative">
                    <div ref={editorRef} contentEditable onInput={handleInput} className="p-8 min-h-[300px] focus:outline-none text-lg text-gray-800 leading-relaxed prose prose-sm max-w-none" data-placeholder="Share your story with the world..." />
                    <AutocompleteDropdown items={suggestions} onSelect={handleSelectSuggestion} activeIndex={suggestionActiveIdx} />
                </div>
                {showPoll && (
                    <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Poll Configuration</p>
                        {pollOptions.map((opt, i) => (
                            <input key={i} value={opt.text} onChange={e => { const next = [...pollOptions]; next[i].text = e.target.value; setPollOptions(next); }} placeholder={`Option ${i + 1}`} className="w-full h-12 px-5 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" />
                        ))}
                        {pollOptions.length < 5 && <button onClick={() => setPollOptions([...pollOptions, { text: '' }])} className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all uppercase tracking-widest">+ Add Choice</button>}
                    </div>
                )}
                {showFeelings && (
                    <div className="p-5 bg-gray-50 border-t border-gray-100 grid grid-cols-6 gap-3">
                        {feelings.map(f => (<button key={f.name} onClick={() => { setFeeling(f); setShowFeelings(false); }} className={cn("aspect-square rounded-2xl text-2xl flex items-center justify-center hover:bg-white hover:shadow-md transition-all", feeling?.name === f.name ? "bg-white ring-4 ring-blue-50 shadow-sm" : "")}>{f.emoji}</button>))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-4 gap-4">
                {media.map((m, i) => (
                    <div key={i} className="aspect-square rounded-[1.5rem] bg-gray-100 overflow-hidden relative border border-gray-100 group shadow-sm">
                        <img src={m.preview} className="w-full h-full object-cover" />
                        <button onClick={() => setMedia(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-lg">✕</button>
                    </div>
                ))}
                {media.length < 4 && (
                    <label className="aspect-square rounded-[1.5rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/5 cursor-pointer transition-all">
                        <span className="text-3xl font-light mb-1">+</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Add Media</span>
                        <input type="file" className="hidden" multiple accept="image/*,video/*" onChange={(e) => { const files = Array.from(e.target.files); setMedia(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]); }} />
                    </label>
                )}
            </div>
        </div>
    );
}

// 5. EditProfileTab (Restored from oldacc.jsx)
function EditProfileTab({ profile, setProfile, username, isOrg }) {
    const [fields, setFields] = useState({ fullName: profile?.fullname || '', phone: profile?.phone || '', email: profile?.email || '', biography: profile?.biography || '' });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(profile?.profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1746095979/profile-pictures/e2st5nispbicnhnir9cf.jpg');
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);
    const [passModal, setPassModal] = useState(false);
    const [passFields, setPassFields] = useState({ cur: '', n1: '', n2: '' });
    const [passSaving, setPassSaving] = useState(false);
    const [passStatus, setPassStatus] = useState(null);
    const [modeModal, setModeModal] = useState(false);
    const [modeSaving, setModeSaving] = useState(false);

    async function updateProfile(e) {
        e.preventDefault(); setSaving(true); setStatusMsg(null);
        try {
            const fd = new FormData(); fd.append('fullName', fields.fullName); fd.append('phone', fields.phone); fd.append('email', fields.email); fd.append('biography', fields.biography);
            if (photoFile) fd.append('profilePicture', photoFile);
            const res = await apiFetch(`/profile/${username}/update`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');
            setProfile(prev => ({ ...prev, ...data.updatedFields })); setStatusMsg({ text: 'Changes Archived!', ok: true });
        } catch (err) { setStatusMsg({ text: err.message, ok: false }); } finally { setSaving(false); }
    }

    async function updatePassword(e) {
        e.preventDefault(); if (passFields.n1 !== passFields.n2) return setPassStatus({ ok: false, text: "Keys don't match" });
        setPassSaving(true); setPassStatus(null);
        try {
            const res = await apiFetch(`/profile/${username}/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: passFields.cur, newPassword: passFields.n1 }) });
            if (res.ok) { setPassStatus({ ok: true, text: 'Security Updated!' }); setTimeout(() => setPassModal(false), 1500); }
            else { const d = await res.json(); throw new Error(d.error || 'Verification failed'); }
        } catch (err) { setPassStatus({ ok: false, text: err.message }); } finally { setPassSaving(false); }
    }

    async function switchMode(type) {
        setModeSaving(true);
        try {
            const res = await apiFetch(`/profile/${username}/update-type`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_type: type }) });
            if (res.ok) { setProfile(prev => ({ ...prev, profile_type: type })); setModeModal(false); setStatusMsg({ ok: true, text: `Switched to ${type}!` }); }
            else throw new Error('Switch failed');
        } catch (err) { alert(err.message); } finally { setModeSaving(false); }
    }

    return (
        <div className="space-y-6 pb-24">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex items-center gap-8 shadow-sm">
                <img src={photoPreview} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-gray-50 shadow-md" />
                <div className="space-y-3">
                    <h3 className="text-base font-black text-gray-900 leading-none uppercase tracking-tighter">Profile Visuals</h3>
                    <label className="h-11 px-6 rounded-2xl border-2 border-blue-600 text-[10px] font-black text-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest shadow-lg shadow-blue-600/10">
                        Upload Avatar
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
                    </label>
                </div>
            </div>

            <div className={cn('rounded-[2.5rem] p-8 border-2 flex items-center justify-between shadow-sm transition-all', isOrg ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-purple-100' : 'bg-white border-gray-100')}>
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-base font-black text-gray-900 leading-none">Account Identity</p>
                        {isOrg && <span className="text-[10px] font-black text-white bg-purple-600 rounded-full px-2 py-0.5 uppercase tracking-widest">PRO</span>}
                    </div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">{isOrg ? 'Professional · Business Unit' : 'Personal · Individual Profile'}</p>
                </div>
                <button onClick={() => setModeModal(true)} className="h-11 px-6 rounded-2xl bg-white border border-gray-100 text-[10px] font-black text-gray-700 uppercase tracking-widest hover:bg-gray-50 shadow-sm active:scale-95 transition-all">Switch Mode</button>
            </div>

            <form onSubmit={updateProfile} className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-8 shadow-sm">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Identity Core</p>
                <div className="grid gap-6">
                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Display Full Name</label><input type="text" value={fields.fullName} onChange={e => setFields({ ...fields, fullName: e.target.value })} className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-black outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all" /></div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Contact Phone</label><input type="tel" value={fields.phone} onChange={e => setFields({ ...fields, phone: e.target.value })} className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-black outline-none focus:ring-4 focus:ring-blue-50 transition-all" /></div>
                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Email Address</label><input type="email" value={fields.email} onChange={e => setFields({ ...fields, email: e.target.value })} className="w-full h-14 px-6 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-black outline-none focus:ring-4 focus:ring-blue-50 transition-all" /></div>
                    </div>
                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Profile Biography</label><textarea rows={4} value={fields.biography} onChange={e => setFields({ ...fields, biography: e.target.value })} className="w-full p-6 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all resize-none leading-relaxed" /></div>
                </div>
                <Yt msg={statusMsg} />
                <button disabled={saving} className="w-full h-16 bg-blue-600 text-white rounded-[1.5rem] text-[11px] font-black active:scale-95 transition-all shadow-2xl shadow-blue-600/20 uppercase tracking-[0.2em]">{saving ? 'Syncing...' : 'Archive Changes'}</button>
            </form>

            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">{K.Lock}</div>
                    <div><p className="text-sm font-black text-gray-900 leading-none mb-1.5 uppercase tracking-tighter">Security Key</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Update your access credential</p></div>
                </div>
                <button onClick={() => setPassModal(true)} className="h-11 px-6 rounded-2xl border-2 border-gray-100 text-[10px] font-black text-gray-600 uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all">Revise Key</button>
            </div>

            <BottomSheet open={passModal} onClose={() => setPassModal(false)} title="Security Update">
                <form onSubmit={updatePassword} className="p-6 space-y-5 pb-12">
                    <input type="password" placeholder="Existing Key" value={passFields.cur} onChange={e => setPassFields({ ...passFields, cur: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:bg-white transition-all" />
                    <input type="password" placeholder="New Access Key" value={passFields.n1} onChange={e => setPassFields({ ...passFields, n1: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:bg-white transition-all" />
                    <input type="password" placeholder="Confirm New Key" value={passFields.n2} onChange={e => setPassFields({ ...passFields, n2: e.target.value })} className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:bg-white transition-all" />
                    <Yt msg={passStatus} />
                    <button disabled={passSaving} className="w-full h-14 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-blue-600/10">Authorize Key Update</button>
                </form>
            </BottomSheet>

            <BottomSheet open={modeModal} onClose={() => setModeModal(false)} title="Toggle Identity Mode">
                <div className="p-6 space-y-4 pb-12">
                    <button onClick={() => switchMode('Individual')} className={cn('w-full p-6 rounded-[2rem] border-2 text-left transition-all', !isOrg ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100')}>
                        <p className="text-base font-black text-gray-900 leading-none mb-2">Personal Identity</p>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed">Standard access for social discovery and connection.</p>
                    </button>
                    <button onClick={() => switchMode('Organisation')} className={cn('w-full p-6 rounded-[2rem] border-2 text-left transition-all', isOrg ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100')}>
                        <p className="text-base font-black text-gray-900 leading-none mb-2 uppercase tracking-tighter">Professional Unit</p>
                        <p className="text-xs text-gray-500 font-bold leading-relaxed">Unlocks monetization hub, depth analytics, and pro badges.</p>
                    </button>
                </div>
            </BottomSheet>
        </div>
    );
}

// 6. PostsTab (Full Feature Restoration)
function PostsTab({ posts, setPosts, setTab }) {
    const [editingPost, setEditingPost] = useState(null);
    const [editText, setEditText] = useState('');
    const [saving, setSaving] = useState(false);
    const filtered = posts.filter(p => p.type !== 'snap');

    const save = async () => {
        setSaving(true);
        try {
            const res = await apiFetch(`/edit-post`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: editingPost.id, content: editText }) });
            if (res.ok) { setPosts(prev => prev.map(p => (p.id === editingPost.id ? { ...p, text: editText } : p))); setEditingPost(null); }
            else throw new Error('Update sync failed');
        } catch (err) { alert(err.message); } finally { setSaving(false); }
    };

    const del = async (id) => {
        if (!confirm('Permanently remove this publication?')) return;
        const res = await apiFetch(`/delete-post?postId=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.ok) setPosts(prev => prev.filter(p => p.id !== id));
    };

    if (!filtered.length) return <div className="py-24 text-center px-10 space-y-5"><div className="w-20 h-20 rounded-[2.5rem] bg-gray-50 flex items-center justify-center text-gray-200 mx-auto text-4xl shadow-sm">{K.Posts}</div><p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Zero Active Publications</p><button onClick={() => setTab('composer')} className="h-12 px-8 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 active:scale-95 transition-all">Launch Masterpiece</button></div>;

    return (
        <div className="space-y-5 pb-24">
            <div className="flex items-center justify-between mb-8">
                <div><h2 className="text-2xl font-black text-gray-900 leading-none">Content Archive</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">{filtered.length} Discovered Publications</p></div>
                <button onClick={() => setTab('composer')} className="h-11 px-5 rounded-2xl bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all">+ New Post</button>
            </div>

            {filtered.map(post => (
                <div key={post.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-6 space-y-5 hover:border-blue-100 hover:shadow-xl hover:shadow-gray-500/5 transition-all group">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">{post.type === 'poll' ? <span className="text-xl">📊</span> : <NavIcons.Menu className="w-6 h-6" />}</div>
                            <div><p className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none mb-1.5">{post.type || 'Standard Post'}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(post.created_at).toLocaleDateString()} · {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingPost(post); setEditText(post.text?.replace(/<[^>]*>/g, '') || ''); }} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-blue-600 hover:text-white transition-all">{K.Edit}</button>
                            <button onClick={() => del(post.id)} className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-red-600 hover:text-white transition-all">{K.Trash}</button>
                        </div>
                    </div>
                    <div className="text-base text-gray-700 font-medium leading-relaxed bg-gray-50/50 p-6 rounded-[1.5rem] border border-gray-50/80"><RichText html={post.text} /></div>
                    {post.media?.[0] && <div className="rounded-[1.5rem] overflow-hidden aspect-video bg-gray-100 border border-gray-100">{/\.(mp4|webm|ogg)/i.test(post.media[0]) ? <video src={post.media[0]} className="w-full h-full object-cover" muted /> : <img src={post.media[0]} className="w-full h-full object-cover" />}</div>}
                    <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
                        <span className="flex items-center gap-2"><span className="text-red-500 text-xs">❤</span> {post.likes?.length || 0} Interactions</span>
                        <span className="flex items-center gap-2"><span className="text-blue-500 text-xs">💬</span> {post.comments?.length || 0} Discussions</span>
                        {post.type === 'poll' && <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[8px] tracking-tighter">LIVE POLL</span>}
                        <button onClick={() => window.Lexum?.navigate(`/post/${post.id}`)} className="ml-auto flex items-center gap-2 hover:text-blue-600 transition-colors">VIEW LIVE <span className="text-xs">→</span></button>
                    </div>
                </div>
            ))}
            <BottomSheet open={!!editingPost} onClose={() => setEditingPost(null)} title="Revise Publication" wide>
                <div className="p-8 space-y-6 pb-14">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Edit content below</p>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={12} className="w-full p-8 bg-gray-50 border border-gray-100 rounded-[2.5rem] text-base font-bold focus:bg-white focus:ring-8 focus:ring-blue-50 outline-none transition-all resize-none leading-relaxed" />
                    <div className="flex gap-4">
                        <button onClick={() => setEditingPost(null)} className="flex-1 h-16 rounded-2xl border-2 border-gray-100 text-[11px] font-black text-gray-500 hover:bg-gray-50 active:scale-95 transition-all uppercase tracking-widest">Cancel Sync</button>
                        <button onClick={save} disabled={saving} className="flex-1 h-16 bg-blue-600 text-white rounded-2xl text-[11px] font-black active:scale-95 transition-all disabled:opacity-40 shadow-2xl shadow-blue-600/20 uppercase tracking-widest">{saving ? 'Syncing...' : 'Confirm Sync'}</button>
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
}

// 7. SnapsTab
function SnapsTab({ posts, setPosts, setTab, username }) {
    const [preview, setPreview] = useState(null);
    const snaps = posts.filter(p => p.type === 'snap');
    return (
        <div className="space-y-8 pb-24">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-black text-gray-900 leading-none">Studio Snaps</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">{snaps.length} Discovered Clips</p></div>
                <button onClick={() => setTab('composer')} className="h-11 px-6 rounded-2xl bg-white border-2 border-blue-600 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-600/5">New Capture</button>
            </div>
            <div className="grid grid-cols-3 gap-5">
                {snaps.map(snap => (
                    <div key={snap.id} className="aspect-[9/16] rounded-[2rem] bg-gray-900 overflow-hidden relative group cursor-pointer border-4 border-white shadow-xl" onClick={() => setPreview(snap)}>
                        <video src={snap.media?.[0]} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" muted />
                        <div className="absolute bottom-5 left-5 text-[10px] font-black text-white flex items-center gap-3 drop-shadow-lg"><span className="bg-black/30 px-2 py-1 rounded-lg backdrop-blur-md">❤ {snap.likes?.length || 0}</span><span className="bg-black/30 px-2 py-1 rounded-lg backdrop-blur-md">👁 {snap.views || 0}</span></div>
                    </div>
                ))}
            </div>
            <BottomSheet open={!!preview} onClose={() => setPreview(null)} title="Visual Playback">
                <div className="p-8 flex flex-col items-center gap-8">
                    <div className="w-full max-w-[320px] aspect-[9/16] bg-black rounded-[3rem] overflow-hidden shadow-2xl border-[10px] border-white relative"><video src={preview?.media?.[0]} className="w-full h-full object-cover" controls autoPlay loop /></div>
                    <button onClick={() => { if (confirm('Permanently wipe from studio?')) apiFetch(`/delete-post?postId=${preview.id}`, { method: 'DELETE' }).then(() => { setPosts(prev => prev.filter(p => p.id !== preview.id)); setPreview(null); }) }} className="w-full h-16 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black active:scale-95 transition-all border-2 border-red-100 uppercase tracking-[0.2em]">Wipe From Archive</button>
                </div>
            </BottomSheet>
        </div>
    );
}

// 8. GrowTab
function GrowTab({ stats, profile, setTab, isOrg }) {
    const bal = stats?.mobcoins || 0;
    const miles = [
        { l: 'Rising Influence', d: 'Reach 5 publications', ok: (stats?.post_count || 0) >= 5, i: <span className="text-2xl">🔥</span> },
        { l: 'Community Anchor', d: 'Acquire 10 loyal followers', ok: (profile?.followers || []).length >= 10, i: <span className="text-2xl">🤝</span> },
        { l: 'Revenue Threshold', d: 'Hit 2,000 Mobcoin milestone', ok: bal >= 2000, i: <span className="text-2xl">💎</span>, k: 'monetize' }
    ];
    return (
        <div className="space-y-8 pb-24">
            <div className="px-1"><h2 className="text-2xl font-black text-gray-900 leading-none">Professional Milestones</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Tracking your creator evolution</p></div>
            <div className="grid gap-4">
                {miles.map(m => (
                    <button key={m.l} onClick={() => m.ok && m.k ? setTab(m.k) : null} className={cn("w-full flex items-center justify-between p-8 rounded-[2.5rem] border-2 transition-all text-left", m.ok ? "bg-emerald-50 border-emerald-100 shadow-lg shadow-emerald-600/5" : "bg-white border-gray-100 opacity-60")}>
                        <div className="flex items-center gap-6"><div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-colors shadow-inner", m.ok ? "bg-emerald-100 text-emerald-600" : "bg-gray-50 text-gray-300")}>{m.i}</div><div><p className="text-lg font-black text-gray-900 leading-none mb-1.5">{m.l}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-tight">{m.d}</p></div></div>
                        {m.ok && <span className="text-emerald-500"><NavIcons.Verified className="w-8 h-8" /></span>}
                    </button>
                ))}
            </div>
        </div>
    );
}

// 9. PrefsTab (Simplified)
function PrefsTab({ profile, setProfile }) {
    const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
    const toggle = () => { const next = !darkMode; setDarkMode(next); localStorage.setItem('theme', next ? 'dark' : 'light'); document.documentElement.classList.toggle('dark', next); window.dispatchEvent(new Event('app:theme:change')); };
    return (
        <div className="space-y-8 pb-24">
            <div className="px-1"><h2 className="text-2xl font-black text-gray-900 leading-none uppercase tracking-tighter">System Workspace</h2><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Adjust your editing environment</p></div>
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex items-center justify-between shadow-sm">
                <div><p className="text-base font-black text-gray-900 leading-none mb-2">High Contrast Mode</p><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Toggle dark visual workspace</p></div>
                <button onClick={toggle} className={cn("w-16 h-8 rounded-full relative transition-all p-1.5", darkMode ? "bg-blue-600" : "bg-gray-200")}>
                    <div className={cn("w-5 h-5 bg-white rounded-full transition-all shadow-md", darkMode ? "translate-x-8" : "translate-x-0")} />
                </button>
            </div>
        </div>
    );
}

// 10. DangerTab
function DangerTab({ username }) {
    const [confirmVal, setConfirmVal] = useState('');
    const [deactivating, setDeactivating] = useState(false);
    const wipe = async () => {
        if (confirmVal !== username) return;
        setDeactivating(true);
        try {
            const res = await apiFetch(`/deactivate-account`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
            if (res.ok) { localStorage.clear(); window.location.href = '/auth'; }
            else throw new Error('Wipe operation failed');
        } catch (err) { alert(err.message); setDeactivating(false); }
    };
    const logout = () => { localStorage.removeItem('currentUser'); localStorage.removeItem('cached_profile_pic'); window.location.href = '/auth'; };

    return (
        <div className="space-y-8 py-10">
            <div className="text-center py-10">
                <div className="w-24 h-24 rounded-[2rem] bg-gray-50 flex items-center justify-center text-gray-400 mx-auto text-4xl mb-6 shadow-inner">{K.Danger}</div>
                <h2 className="text-3xl font-black text-gray-900 leading-none mb-3">Terminate Session?</h2>
                <p className="text-sm text-gray-400 font-bold max-w-xs mx-auto mb-8 uppercase tracking-tight">Your data remains secured on our encrypted cloud nodes.</p>
                <button onClick={logout} className="w-full max-w-sm h-16 bg-red-600 text-white rounded-[1.5rem] text-[11px] font-black active:scale-95 transition-all shadow-2xl shadow-red-600/20 uppercase tracking-[0.3em]">Authorize Logout</button>
            </div>

            <div className="pt-10 border-t border-gray-100">
                <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-10 space-y-6">
                    <p className="text-xs text-red-600 font-black uppercase tracking-widest text-center">Danger Zone: Permanent Account Deletion</p>
                    <input type="text" placeholder={`Type @${username} to confirm wipe`} value={confirmVal} onChange={e => setConfirmVal(e.target.value)} className="w-full h-14 px-6 bg-white border border-red-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-red-100 text-center" />
                    <button onClick={wipe} disabled={confirmVal !== username || deactivating} className="w-full h-16 bg-white text-red-600 border-2 border-red-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all disabled:opacity-30">{deactivating ? 'Wiping Database...' : 'Destroy All Data Permanently'}</button>
                </div>
            </div>
        </div>
    );
}
