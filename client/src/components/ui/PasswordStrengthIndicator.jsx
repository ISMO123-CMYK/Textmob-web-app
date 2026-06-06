export default function PasswordStrengthIndicator({ password }) {
  const checks = [
    { label: '8+ characters', test: (p) => p.length >= 8 },
    { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'Number', test: (p) => /\d/.test(p) },
    { label: 'Special char (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) },
  ];

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {checks.map((check, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
            check.test(password)
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-gray-50 text-gray-400 border border-gray-200'
          }`}
        >
          {check.test(password) ? (
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
          {check.label}
        </span>
      ))}
    </div>
  );
}
