import { useState, useEffect } from 'react';

const FEATURE_STEPS = [
  {
    id: 'f1',
    title: 'Textmob Mobile App',
    description: 'Enjoy a faster, smoother experience with our native Android app! Get instant push notifications, optimized media streaming, and zero web load delays.',
    image: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png',
    isDownloadStep: true
  },
  {
    id: 'f2',
    title: 'Earn Mobcoins',
    description: 'Post updates, engage with others, stay active, and complete challenges to earn Mobcoins! Use them to tip creators or unlock premium profile highlights.',
    image: 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png'
  }
];

function isExternalBrowser() {
  const e = navigator.userAgent || navigator.vendor || window.opera;
  return !['FBAN', 'FBAV', 'Instagram', 'Messenger', 'Line', 'WeChat', 'Snapchat', 'Twitter', 'WhatsApp', 'TikTok', 'Telegram', 'Pinterest', 'LinkedIn', 'wv', 'WebView', 'OPR/', 'OPT/', 'YaApp'].some(t => e.includes(t));
}

export default function NotificationBanner() {
  const [steps, setSteps] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isValidBrowser, setIsValidBrowser] = useState(false);

  useEffect(() => {
    setIsValidBrowser(isExternalBrowser());
    const seen = JSON.parse(localStorage.getItem('seenFeatures') || '[]');
    const pending = FEATURE_STEPS.filter(step => !seen.includes(step.id));
    setSteps(pending);
    
    if (pending.length > 0) {
      const updated = [...seen, pending[0].id];
      localStorage.setItem('seenFeatures', JSON.stringify(updated));
    }
  }, []);

  async function handleNext() {
    const currentStep = steps[currentIdx];
    if (currentStep.feedback && feedbackText.trim()) {
      console.log(currentStep.id, feedbackText);
    }
    setFeedbackText('');
    const nextIdx = currentIdx + 1;
    if (nextIdx < steps.length) {
      const seen = JSON.parse(localStorage.getItem('seenFeatures') || '[]');
      const nextStep = steps[nextIdx];
      seen.push(nextStep.id);
      localStorage.setItem('seenFeatures', JSON.stringify(seen));
      setCurrentIdx(nextIdx);
    } else {
      setSteps([]);
    }
  }

  if (steps.length === 0) return null;

  const currentStep = steps[currentIdx];

  return (
    <div style={{ zIndex: 9999 }} className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          {currentStep.image && (
            <img src={currentStep.image} alt={currentStep.title} className="max-h-56 w-auto animate-slide-up" />
          )}
        </div>
        <div className="p-6 text-center border-t border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{currentStep.title}</h2>
          <p className="text-gray-600 mb-4 leading-relaxed">{currentStep.description}</p>
          
          {currentStep.feedback && (
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="What do you think about this? Any feedback?"
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {currentStep.isDownloadStep && isValidBrowser && (
            <button
              onClick={() => window.open('https://github.com/ISMO123-CMYK/Textmob-web-app/raw/refs/heads/main/thetextmobapp.apk', '_blank')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 w-full mb-3"
            >
              📥 Download our App
            </button>
          )}

          <button
            onClick={handleNext}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-300"
          >
            {currentIdx + 1 < steps.length ? 'Next' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}
