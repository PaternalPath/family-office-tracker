function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--gray-400)',
          fontSize: '16px'
        }}
      >
        🔍
      </span>
      <input
        type="text"
        className="input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          paddingLeft: '40px'
        }}
      />
    </div>
  )
}

export default SearchBar
