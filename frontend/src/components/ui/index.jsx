// frontend/src/components/ui/Card.jsx
export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-2xl p-6 transition-all
        ${onClick ? 'cursor-pointer hover:border-green-400 hover:shadow-md hover:-translate-y-1' : ''}
        ${className}`}
    >
      {children}
    </div>
  )
}

// frontend/src/components/ui/Badge.jsx
export function Badge({ children, variant = 'green' }) {
  const variants = {
    green:  'bg-green-50 text-green-800 border border-green-200',
    amber:  'bg-amber-50 text-amber-700 border border-amber-200',
    blue:   'bg-blue-50 text-blue-700 border border-blue-200',
    gray:   'bg-gray-100 text-gray-600 border border-gray-200',
    dark:   'bg-green-800 text-white',
  }
  return (
    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${variants[variant]}`}>
      {children}
    </span>
  )
}

// frontend/src/components/ui/Button.jsx
export function Button({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }) {
  const variants = {
    primary:  'bg-green-800 text-white hover:bg-green-700',
    outline:  'bg-white text-gray-800 border border-gray-300 hover:border-green-400',
    ghost:    'bg-transparent text-green-800 hover:bg-green-50',
    danger:   'bg-red-500 text-white hover:bg-red-600',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all
        ${variants[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${className}`}
    >
      {children}
    </button>
  )
}

// frontend/src/components/ui/Spinner.jsx
export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
      <div className="w-8 h-8 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

// frontend/src/components/ui/ErrorMessage.jsx
export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
      <p className="text-red-600 text-sm mb-3">⚠️ {message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-red-700 underline">
          Try again
        </button>
      )}
    </div>
  )
}
