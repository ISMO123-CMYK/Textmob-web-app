import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';

export default function WalletContent() {
  useEffect(() => { if (!localStorage.currentUser) { window.Lexum ? window.Lexum.navigate('/auth') : window.location.href = '/auth'; } }, []);
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState({});
  const [showBalance, setShowBalance] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showEarnModal, setShowEarnModal] = useState(false);
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletMode, setWalletMode] = useState('balance'); // 'balance' or 'live'
  const [payouts, setPayouts] = useState([]);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });

  const showAlert = (title, message) => setAlertModal({ open: true, title, message });
  const [redeemType, setRedeemType] = useState('CASH'); // 'CASH' or 'AIRTIME'
  const [redeemAmount, setRedeemAmount] = useState('');
  const [payoutDetails, setPayoutDetails] = useState({
    bank: '', account_no: '', name: '',
    network: 'MTN', phone: ''
  });
  const [redeeming, setRedeeming] = useState(false);
  const [activeTab, setActiveTab] = useState('actions'); // 'actions', 'redeem', or 'history'
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [modalMode, setModalMode] = useState('send'); // 'send' or 'gift'

  const currentUser = localStorage.getItem('currentUser') || '';
  const modalTitle = modalMode === 'gift' ? 'Gift Mobcoins' : 'Send Mobcoins';
  const buttonLabel = modalMode === 'gift' ? 'Send Gift' : 'Send Mobcoins';

  useEffect(() => {
    if (currentUser) {
      Promise.all([
        apiFetch(`/t/wallet?userId=${encodeURIComponent(currentUser)}`),
        apiFetch(`/api/user/payouts?userId=${encodeURIComponent(currentUser)}`)
      ])
        .then(async ([walletRes, payoutsRes]) => {
          if (walletRes.ok) {
            const data = await walletRes.json();
            console.log('Wallet API response:', data);
            setUser({
              fullname: data.fullname,
              username: data.username,
              isOrg: (data.profile_type || '').toLowerCase() === 'organisation'
            });
            setBalance(data.mobcoins || 0);
          }
          if (payoutsRes.ok) {
            setPayouts(await payoutsRes.json());
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [currentUser]);

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (e.key === 'Escape') {
        setShowSendModal(false);
        setShowGiftModal(false);
        setShowEarnModal(false);
        setShowLearnModal(false);
        setShowRedeemModal(false);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  async function handleRedeem() {
    const amountNum = Number(redeemAmount);
    if (!amountNum || amountNum < 2000) {
      setMessage('Minimum redemption is 2,000 Mobcoins');
      return;
    }
    if (amountNum > balance) {
      setMessage('Insufficient Mobcoins');
      return;
    }

    const details = redeemType === 'CASH'
      ? { bank: payoutDetails.bank, account_no: payoutDetails.account_no, name: payoutDetails.name }
      : { network: payoutDetails.network, phone: payoutDetails.phone };

    if (redeemType === 'CASH' && (!details.bank || !details.account_no || !details.name)) {
      setMessage('Please fill in all bank details');
      return;
    }
    if (redeemType === 'AIRTIME' && (!details.network || !details.phone)) {
      setMessage('Please fill in airtime details');
      return;
    }

    setRedeeming(true);
    setMessage('Processing your request...');

    try {
      const res = await apiFetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser,
          amount: amountNum,
          type: redeemType,
          details
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redemption failed');

      setMessage(data.message);

      // Refresh balance and payouts
      const [walletRes, payoutsRes] = await Promise.all([
        apiFetch(`/t/wallet?userId=${encodeURIComponent(currentUser)}`),
        apiFetch(`/api/user/payouts?userId=${encodeURIComponent(currentUser)}`)
      ]);
      if (walletRes.ok) setBalance((await walletRes.json()).mobcoins || 0);
      if (payoutsRes.ok) setPayouts(await payoutsRes.json());

      setTimeout(() => {
        setShowRedeemModal(false);
        setMessage('');
        setRedeemAmount('');
      }, 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setRedeeming(false);
    }
  }

  async function handleSearch(q) {
    if (!q?.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await apiFetch(`/search?query=${encodeURIComponent(q)}&currentUsername=${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      setSearchResults(res.ok ? data : []);
    } catch {
      setSearchResults([]);
    }
  }

  function openModal(mode = 'send') {
    setModalMode(mode);
    setMessage('');
    setSelectedUsers([]);
    setSearchResults([]);
    setSearchQuery('');
    setAmount('');
    if (mode === 'gift') {
      setShowGiftModal(true);
    } else {
      setShowSendModal(true);
    }
  }

  function closeModal() {
    setShowSendModal(false);
    setShowGiftModal(false);
    setMessage('');
    setSelectedUsers([]);
    setSearchResults([]);
    setSearchQuery('');
    setAmount('');
  }

  async function handleSend() {
    if (!selectedUsers.length || !amount) {
      setMessage('Please select a recipient and enter an amount');
      return;
    }
    if (Number(amount) <= 0) {
      setMessage('Amount must be greater than 0');
      return;
    }
    if (Number(amount) > balance) {
      setMessage('Insufficient Mobcoins');
      return;
    }
    setSending(true);
    setMessage('Processing…');
    try {
      const res = await apiFetch('/t/send-mobcoins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: currentUser,
          toIds: selectedUsers.map(e => e.username),
          amount: Number(amount)
        })
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setMessage((await res.json()).message || 'Sent successfully!');

      // Update balance
      const balanceRes = await apiFetch(`/t/wallet?userId=${encodeURIComponent(currentUser)}`);
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setBalance(balanceData.mobcoins || 0);
      }
      setTimeout(() => closeModal(), 1200);
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {alertModal.open && (
          <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4" onClick={() => setAlertModal({ ...alertModal, open: false })}>
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">{alertModal.title}</h3>
              <p className="text-sm text-gray-600 mb-6">{alertModal.message}</p>
              <button onClick={() => setAlertModal({ ...alertModal, open: false })} className="w-full h-11 bg-blue-600 text-white rounded-xl font-bold">OK</button>
            </div>
          </div>
        )}
        <div className="h-32 bg-gray-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  const redeemItems = [
    {
      label: 'Redeem for Airtime',
      sub: 'Instant top-up for your phone',
      color: 'text-green-600 bg-green-50',
      onClick: () => {
        setRedeemType('AIRTIME');
        setMessage('');
        setShowRedeemModal(true);
      },
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 15.75h3" />
        </svg>
      )
    },
    {
      label: 'Redeem for Cash',
      sub: 'Direct bank transfer to your account',
      color: 'text-indigo-600 bg-indigo-50',
      onClick: () => {
        setRedeemType('CASH');
        setMessage('');
        setShowRedeemModal(true);
      },
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-white pb-28 md:pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Wallet</h1>
            <p className="text-xs text-gray-400">{user.username ? `@${user.username}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWalletMode(prev => prev === 'balance' ? 'live' : 'balance')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${walletMode === 'live' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}
            >
              {walletMode === 'live' ? 'Live Mode' : 'Wallet Mode'}
            </button>
          </div>
        </div>

        <div className="relative rounded-2xl bg-blue-600 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)',
            backgroundSize: '28px 28px'
          }} />
          <div className="relative p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-2">
                  {walletMode === 'live' ? 'Wallet Value (NGN)' : 'Mobcoins Balance'}
                </p>
                <div className="flex items-center gap-2.5">
                  <span className="text-5xl font-black text-white tracking-tight leading-none">
                    {!showBalance ? '·····' : (walletMode === 'live' ? `₦${(balance * 0.1).toLocaleString()}` : balance.toLocaleString())}
                  </span>
                </div>
                {user.fullname && <p className="text-xs text-blue-300 mt-2">Hi, {user.fullname}</p>}
              </div>
              <button
                onClick={() => setShowBalance(prev => !prev)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-blue-100 hover:bg-white/20 transition-colors flex-shrink-0 mb-1"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setActiveTab('actions')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'actions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
          >
            Send/Earn
          </button>
          <button 
            onClick={() => window.Lexum ? window.Lexum.navigate('/accountscenter') : window.location.href = '/accountscenter'}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'redeem' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
          >
            Redeem
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}
          >
            History
          </button>
        </div>

        {activeTab === 'actions' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => openModal('send')}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.97] transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Send</p>
                  <p className="text-xs text-gray-400">Transfer coins</p>
                </div>
              </button>
              <button
                onClick={() => setShowEarnModal(true)}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.97] transition-all text-left relative"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500 flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v1m0 10v1M9.5 9.5A1.5 1.5 0 0111 8h1.5a1.5 1.5 0 010 3H11a1.5 1.5 0 000 3h1.5A1.5 1.5 0 0014 12.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Earn</p>
                  <p className="text-xs text-gray-400">Get more coins</p>
                </div>
                <span className="absolute top-2.5 right-3 text-[9px] font-bold uppercase tracking-wider text-gray-400 border border-gray-200 px-1.5 py-0.5 rounded-full">Soon</span>
              </button>
            </div>

            <button
              onClick={() => setShowLearnModal(true)}
              className="w-full flex items-center justify-between px-4 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">How to earn Mobcoins</p>
                  <p className="text-xs text-gray-400">Tips to grow your balance</p>
                </div>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300 fill-none stroke-current flex-shrink-0" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {activeTab === 'redeem' && (
          !user.isOrg ? (
            <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-2xl">
              <p className="text-sm font-semibold mb-2">Upgrade to Professional</p>
              <p className="text-xs">Personal accounts cannot redeem earnings. Please go to Edit Profile → Switch Mode to upgrade.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100">
                <p className="text-sm font-bold text-blue-900 mb-2">How Redemption Works</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-xs text-blue-700">
                    <span className="font-bold">•</span>
                    <span><strong>Rate:</strong> 1 Mobcoin = ₦0.10 (500 coins = ₦50).</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-blue-700">
                    <span className="font-bold">•</span>
                    <span><strong>Minimum:</strong> You need at least 2,000 coins to redeem.</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-blue-700">
                    <span className="font-bold">•</span>
                    <span><strong>Schedule:</strong> Payouts are processed every <strong>Saturday</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-blue-700">
                    <span className="font-bold">•</span>
                    <span><strong>Limit:</strong> You can only make <strong>one</strong> redemption request per week.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                {redeemItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all text-left border border-gray-100"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-bold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-300 fill-none stroke-current" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              <button
                disabled
                className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl bg-gray-50/50 opacity-60 text-left border border-dashed border-gray-200"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-400">Post Boost (Soon)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Use coins to promote your posts</p>
                </div>
              </button>
            </div>
          )
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {payouts.length === 0 ? (
              <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-sm text-gray-400">No payout history yet.</p>
              </div>
            ) : (
              payouts.map(p => (
                <div key={p.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900">
                        {p.type === 'CASH' ? 'Bank Transfer' : `Airtime (${p.payout_details.network})`}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${p.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                          p.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                        }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {p.type === 'CASH' ? `${p.payout_details.bank} • ${p.payout_details.account_no}` : p.payout_details.phone}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">₦{Number(p.naira_value).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">{p.coin_amount.toLocaleString()} coins</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 mb-1">What are Mobcoins?</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Mobcoins are reward points earned by being active on Textmob. You can redeem them for
              <span className="font-semibold text-gray-800"> real money</span> or
              <span className="font-semibold text-gray-800"> airtime</span> once you reach the 2,000 coin threshold.
            </p>
          </div>
        </div>
      </div>

      {showRedeemModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowRedeemModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-[110] pointer-events-none">
            <div className="pointer-events-auto w-full md:max-w-md md:rounded-2xl bg-white rounded-t-2xl border-t md:border border-gray-100 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 pt-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-base font-bold text-gray-900">Redeem for {redeemType === 'CASH' ? 'Cash' : 'Airtime'}</p>
                  <button onClick={() => setShowRedeemModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl mb-5 text-center">
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">Estimated Value</p>
                  <p className="text-3xl font-black text-blue-600">₦{Number(redeemAmount * 0.1 || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-blue-400 mt-1">Min. 2,000 Mobcoins (₦200)</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount to Redeem</label>
                    <input
                      type="number"
                      value={redeemAmount}
                      onChange={e => setRedeemAmount(e.target.value)}
                      placeholder="Enter amount (min. 2000)"
                      className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-400 text-gray-800"
                    />
                  </div>

                  {redeemType === 'CASH' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Bank Name</label>
                        <input
                          type="text"
                          value={payoutDetails.bank}
                          onChange={e => setPayoutDetails({ ...payoutDetails, bank: e.target.value })}
                          placeholder="e.g. Opay, Kuda, Zenith..."
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account Number</label>
                        <input
                          type="text"
                          value={payoutDetails.account_no}
                          onChange={e => setPayoutDetails({ ...payoutDetails, account_no: e.target.value })}
                          placeholder="10-digit number"
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-800"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account Name</label>
                        <input
                          type="text"
                          value={payoutDetails.name}
                          onChange={e => setPayoutDetails({ ...payoutDetails, name: e.target.value })}
                          placeholder="Your full name as on bank"
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-800"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Network</label>
                        <select
                          value={payoutDetails.network}
                          onChange={e => setPayoutDetails({ ...payoutDetails, network: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-800"
                        >
                          <option>MTN</option>
                          <option>Airtel</option>
                          <option>Glo</option>
                          <option>9mobile</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                        <input
                          type="text"
                          value={payoutDetails.phone}
                          onChange={e => setPayoutDetails({ ...payoutDetails, phone: e.target.value })}
                          placeholder="080..."
                          className="w-full px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all text-gray-800"
                        />
                      </div>
                    </>
                  )}
                </div>

                {message && (
                  <p className={`text-xs text-center mt-4 font-semibold ${message.toLowerCase().includes('error') || message.toLowerCase().includes('insufficient') || message.toLowerCase().includes('wait') ? 'text-red-500' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}

                <div className="flex gap-2 mt-6">
                  <button onClick={() => setShowRedeemModal(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {redeeming ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showSendModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={closeModal} />
          <div className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-[110] pointer-events-none">
            <div className="pointer-events-auto w-full md:max-w-md md:rounded-2xl bg-white rounded-t-2xl border-t md:border border-gray-100 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-9 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 pt-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-base font-bold text-gray-900">{modalTitle}</p>
                  <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-4 px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-500">
                    Available balance:{' '}
                    <span className="font-bold text-gray-900">{balance.toLocaleString()} Mobcoins</span>
                  </span>
                </div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recipient</label>
                <div className="relative mb-3">
                  <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 fill-none stroke-current" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103 10.5a7.5 7.5 0 0013.15 6.15z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    placeholder="Search by name or username…"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-400 text-gray-800"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="rounded-xl border border-gray-100 overflow-hidden mb-3">
                    {searchResults.slice(0, 5).map(e => (
                      <button
                        onClick={() => {
                          if (!selectedUsers.some(t => t.username === e.username)) {
                            setSelectedUsers(t => [...t, e]);
                          }
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                        key={e.username}
                      >
                        <img src={e.profile_pic || '/assets/default-avatar.jpg'} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{e.fullname}</p>
                          <p className="text-xs text-gray-400 truncate">@{e.username}</p>
                        </div>
                        {selectedUsers.some(t => t.username === e.username) && (
                          <span className="text-[10px] font-bold text-blue-600 flex-shrink-0">Added</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedUsers.map(e => (
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold" key={e.username}>
                        <img src={e.profile_pic || '/assets/default-avatar.jpg'} className="w-4 h-4 rounded-full object-cover" alt="" />
                        {e.fullname}
                        <button
                          onClick={() => setSelectedUsers(t => t.filter(t => t.username !== e.username))}
                          className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5"
                          aria-label="Remove"
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount</label>
                <div className="relative mb-5">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-yellow-500 fill-none stroke-current" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v1m0 10v1M9.5 9.5A1.5 1.5 0 0111 8h1.5a1.5 1.5 0 010 3H11a1.5 1.5 0 000 3h1.5A1.5 1.5 0 0014 12.5" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all placeholder-gray-400 text-gray-800"
                  />
                </div>
                {message && (
                  <p className={`text-xs text-center mb-4 font-semibold ${message.toLowerCase().includes('error') || message.toLowerCase().includes('insufficient') ? 'text-red-500' : 'text-green-600'}`}>
                    {message}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !selectedUsers.length || !amount}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending…' : buttonLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showGiftModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={closeModal} />
          <div className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-[110] pointer-events-none">
            <div className="pointer-events-auto w-full md:max-w-md md:rounded-2xl bg-white rounded-t-2xl border-t md:border border-gray-100 max-h-[92vh] overflow-y-auto">
              <div className="px-5 pt-4 pb-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-pink-500 fill-none stroke-current" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">Gifting coming soon</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  Surprise your friends with gift boxes! This feature is being tuned. For now, please use the Send tab to transfer coins.
                </p>
                <button onClick={closeModal} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all">
                  Got it
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showEarnModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowEarnModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-[110] pointer-events-none">
            <div className="pointer-events-auto w-full md:max-w-sm md:rounded-2xl bg-white rounded-t-2xl border-t md:border border-gray-100">
              <div className="px-5 pt-4 pb-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-yellow-50 flex items-center justify-center mx-auto mb-4">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-yellow-500 fill-none stroke-current" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v1m0 10v1M9.5 9.5A1.5 1.5 0 0111 8h1.5a1.5 1.5 0 010 3H11a1.5 1.5 0 000 3h1.5A1.5 1.5 0 0014 12.5" />
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-900 mb-1">Earning is coming soon</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                  We're building ways for you to earn Mobcoins, through watch rewards, daily check-ins, referrals, and more. Stay tuned!
                </p>
                <button onClick={() => setShowEarnModal(false)} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all">
                  Got it
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showLearnModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setShowLearnModal(false)} />
          <div className="fixed bottom-0 left-0 right-0 md:inset-0 md:flex md:items-center md:justify-center z-[110] pointer-events-none">
            <div className="pointer-events-auto w-full md:max-w-md md:rounded-2xl bg-white rounded-t-2xl border-t md:border border-gray-100 max-h-[80vh] overflow-y-auto">
              <div className="px-5 pt-4 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-base font-bold text-gray-900">How to earn Mobcoins</p>
                  <button onClick={() => setShowLearnModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>,
                      color: 'text-blue-600 bg-blue-50',
                      label: 'Post regularly',
                      sub: 'Share posts, thoughts, snaps and events. Active creators earn more.'
                    },
                    {
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
                      color: 'text-red-500 bg-red-50',
                      label: 'React & like content',
                      sub: 'Engage with posts from people you follow. Every reaction counts.'
                    },
                    {
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>,
                      color: 'text-green-600 bg-green-50',
                      label: 'Comment meaningfully',
                      sub: 'Leave thoughtful comments on posts. Quality over quantity.'
                    },
                    {
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
                      color: 'text-purple-600 bg-purple-50',
                      label: 'Grow your network',
                      sub: 'Add friends and follow people. A bigger network means more engagement.'
                    },
                    {
                      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                      color: 'text-amber-600 bg-amber-50',
                      label: 'Stay consistent',
                      sub: 'Show up daily. Consistent activity is rewarded over time.'
                    }
                  ].map((item, t) => (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-gray-50" key={t}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${item.color}`}>{item.icon}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 leading-snug">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowLearnModal(false)} className="w-full mt-5 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all">
                  Got it
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
