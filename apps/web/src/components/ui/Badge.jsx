function Badge({ children, variant = 'default', size = 'md' }) {
  const variants = {
    default: { bg: 'var(--gray-100)', color: 'var(--gray-700)' },
    success: { bg: 'rgba(34, 197, 94, 0.1)', color: '#166534' },
    warning: { bg: 'rgba(249, 115, 22, 0.1)', color: '#9a3412' },
    danger: { bg: 'rgba(239, 68, 68, 0.1)', color: '#991b1b' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--blue-700)' },
    uncategorized: { bg: 'var(--orange-500)', color: 'white' }
  }

  const sizes = {
    sm: { padding: '2px 6px', fontSize: '11px' },
    md: { padding: '3px 8px', fontSize: '12px' },
    lg: { padding: '4px 10px', fontSize: '13px' }
  }

  const style = variants[variant] || variants.default
  const sizeStyle = sizes[size] || sizes.md

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 500,
        borderRadius: '4px',
        ...style,
        ...sizeStyle
      }}
    >
      {children}
    </span>
  )
}

export default Badge
