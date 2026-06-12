export function VerifiedBadge({ className = "w-4 h-4" }) {
  return (
    <span
      className={`${className} inline-flex flex-none items-center justify-center`}
      style={{ lineHeight: 0 }}
    >
      <svg
        viewBox="0 0 20 20"
        className="block h-full w-full"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Circle */}
        <circle cx="10" cy="10" r="9.25" fill="#0f4c81" />

        {/* Balanced checkmark with equal internal padding */}
        <path
          d="M6.5 10.5l2.5 2.5 4.5-5"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}