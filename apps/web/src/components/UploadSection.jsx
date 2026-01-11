import { useState, useRef } from 'react'

function UploadSection({ csvFile, csvSource, transactions, parseError, onUpload }) {
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
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">1. Upload CSV</div>
          <div className="card-subtitle">Bank or credit card transactions</div>
        </div>
      </div>

      <div className="form-group">
        <label className="label">Source Type</label>
        <select
          className="select"
          value={source}
          onChange={(e) => handleSourceChange(e.target.value)}
        >
          <option value="generic">Generic CSV</option>
          <option value="chase">Chase Credit Card</option>
          <option value="costco">Costco Anywhere Visa (Citi)</option>
        </select>
        <div className="text-xs text-muted mt-2">
          {source === 'generic' && 'Standard format with Date, Description, Amount columns'}
          {source === 'chase' && 'Chase credit card export with Transaction Date, Description, Type, Amount'}
          {source === 'costco' && 'Costco Citi export with separate Debit/Credit columns'}
        </div>
      </div>

      {!csvFile && (
        <>
          <div
            className={`drop-zone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <div className="drop-zone-icon">📄</div>
            <div className="drop-zone-text">
              Drop CSV file here or click to browse
            </div>
            <div className="drop-zone-hint">
              Supports {source} format
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </>
      )}

      {csvFile && (
        <div className="file-info">
          <span className="file-info-icon">📄</span>
          <div className="file-info-text">
            <div className="file-info-name">{csvFile.name}</div>
            <div className="file-info-size">
              {(csvFile.size / 1024).toFixed(1)} KB
              {transactions && ` • ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} parsed`}
            </div>
          </div>
          <button
            className="button button-sm button-secondary"
            onClick={() => {
              setCsvFile(null)
              onUpload(null, source)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          >
            Remove
          </button>
        </div>
      )}

      {parseError && (
        <div className="alert alert-error">
          <strong>Parse Error:</strong> {parseError}
        </div>
      )}

      {transactions && transactions.length > 0 && !parseError && (
        <div className="alert alert-success">
          ✓ Successfully parsed {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

export default UploadSection
