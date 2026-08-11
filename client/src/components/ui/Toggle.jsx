import { cn } from '../../utils/classNames';

export default function Toggle({ checked, onChange, size = 'md', disabled = false, label = 'Toggle' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        size === 'sm' ? 'w-9 h-5' : 'w-11 h-6',
        checked ? 'bg-blue-600' : 'bg-gray-300 hover:bg-gray-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block transform rounded-full bg-white shadow-sm transition-transform duration-200',
          size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5',
          checked ? (size === 'sm' ? 'translate-x-[18px]' : 'translate-x-[22px]') : 'translate-x-0.5'
        )}
      />
    </button>
  );
}