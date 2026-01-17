import { useState, useRef } from 'react'

function UploadSection({
  csvFile,
  csvSource,
  transactions,
  parseError,
  parseErrors = [],
  onUpload,
  onLoadSample,
  loadingSample
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [source, setSource] = useState(csvSource)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      onUpload(files[0], source)
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      onUpload(files[0], source)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleSourceChange = (newSource) => {
    setSource(newSource)
    if (csvFile) {
      onUpload(csvFile, newSource)
    }
  }

  return (
    <section className="card" aria-labelledby="upload-title">
      <div className="card-header">
        <div>
          <h2 id="upload-title" className="card-title">
            1. Upload CSV
          </h2>
          <p className="card-subtitle">Bank or credit card transactions</p>
        </div>
        {onLoadSample && !csvFile && (
          <button
            className="button button-sm button-secondary"
            onClick={onLoadSample}
            disabled={loadingSample}
          >
            {loadingSample ? 'Loading...' : 'Load Sample'}
          </button>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="source-select" className="label">
          Source Type
        </label>
        <select
          id="source-select"
          className="select"
          value={source}
          onChange={(e) => handleSourceChange(e.target.value)}
        >
          <option value="generic">Generic CSV</option>
          <option value="chase">Chase Credit Card</option>
          <option value="costco">Costco Anywhere Visa (Citi)</option>
        </select>
        <p className="text-xs text-muted mt-2">
          {source === 'generic' && 'Standard format with Date, Description, Amount columns'}
          {source === 'chase' &&
            'Chase credit card export with Transaction Date, Description, Type, Amount'}
          {source === 'costco' && 'Costco Citi export with separate Debit/Credit columns'}
        </p>
      </div>

      {!csvFile && (
        <>
          <div
            className={`drop-zone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
              }
            }}
            aria-label="Drop CSV file here or click to browse"
          >
            <div className="drop-zone-icon" aria-hidden="true">
              📄
            </div>
            <div className="drop-zone-text">Drop CSV file here or click to browse</div>
            <div className="drop-zone-hint">Supports {source} format</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            aria-hidden="true"
          />
        </>
      )}

      {csvFile && (
        <div className="file-info">
          <span className="file-info-icon" aria-hidden="true">
            📄
          </span>
          <div className="file-info-text">
            <div className="file-info-name">{csvFile.name}</div>
            <div className="file-info-size">
              {(csvFile.size / 1024).toFixed(1)} KB
              {transactions &&
                ` • ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} parsed`}
            </div>
          </div>
          <button
            className="button button-sm button-secondary"
            onClick={() => {
              onUpload(null, source)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            aria-label="Remove uploaded file"
          >
            Remove
          </button>
        </div>
      )}

      {parseError && (
        <div className="alert alert-error" role="alert">
          <strong>Parse Error:</strong> {parseError}
        </div>
      )}

      {parseErrors.length > 0 && !parseError && (
        <details className="alert alert-warning">
          <summary style={{ cursor: 'pointer' }}>
            {parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} skipped due to validation
            errors
          </summary>
          <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '12px' }}>
            {parseErrors.slice(0, 5).map((err, idx) => (
              <li key={idx}>
                Row {err.row}: {err.message}
              </li>
            ))}
            {parseErrors.length > 5 && <li>...and {parseErrors.length - 5} more</li>}
          </ul>
        </details>
      )}

      {transactions && transactions.length > 0 && !parseError && (
        <div className="alert alert-success" role="status">
          Successfully parsed {transactions.length} transaction
          {transactions.length !== 1 ? 's' : ''}
        </div>
      )}
    </section>
  )
}

export default UploadSection
