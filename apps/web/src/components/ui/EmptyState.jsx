function EmptyState({ icon, title, description, action }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 24px',
        color: 'var(--gray-500)'
      }}
    >
      {icon && (
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--gray-700)',
          marginBottom: '8px'
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '20px' }}>
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

export default EmptyState
