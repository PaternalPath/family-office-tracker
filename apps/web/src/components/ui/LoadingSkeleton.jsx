function LoadingSkeleton({ count = 1, height = 20 }) {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  return (
    <>
      {skeletons.map((i) => (
        <div
          key={i}
          style={{
            height: `${height}px`,
            background: 'linear-gradient(90deg, var(--gray-200) 25%, var(--gray-100) 50%, var(--gray-200) 75%)',
            backgroundSize: '200% 100%',
            borderRadius: 'var(--border-radius-sm)',
            marginBottom: '12px',
            animation: 'shimmer 1.5s infinite'
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}

export default LoadingSkeleton
