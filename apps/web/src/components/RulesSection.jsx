import { useRef } from 'react'

const EXAMPLE_RULES = {
  "ventures": ["venture-a", "venture-b", "venture-c"],
  "rules": [
    {
      "id": "openai-subscription",
      "priority": 50,
      "when": {
        "any_contains": ["openai", "chatgpt"],
        "amount_lt": 0
      },
      "then": {
        "category": "Software",
        "venture": "venture-c",
        "requiresReceipt": false,
        "note": "AI tools subscription"
      }
    },
    {
      "id": "shared-office-internet",
      "priority": 100,
      "when": {
        "regex": { "pattern": "COMCAST|XFINITY", "flags": "i" },
        "amount_between": { "min": -200, "max": -50 }
      },
      "then": {
        "category": "Internet",
        "requiresReceipt": true,
        "split": [
          { "venture": "venture-c", "percent": 60, "note": "Primary use" },
          { "venture": "venture-a", "percent": 40, "note": "Secondary use" }
        ]
      }
    }
  ]
}

function RulesSection({ rulesJson, rulesFile, rulesError, onRulesChange }) {
  const fileInputRef = useRef(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const text = await file.text()
        onRulesChange(text)
      } catch (err) {
        alert('Failed to read file: ' + err.message)
      }
    }
  }

  const loadExample = () => {
    onRulesChange(JSON.stringify(EXAMPLE_RULES, null, 2))
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">2. Rules</div>
          <div className="card-subtitle">Upload or paste categorization rules</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className="flex gap-2">
            <button
              className="button button-sm button-secondary"
              onClick={loadExample}
            >
              Load Example
            </button>
            <button
              className="button button-sm button-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload JSON
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: 0 }}>
            Example data only — nothing personal is included.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <div className="form-group">
        <label className="label">Rules JSON</label>
        <textarea
          className="textarea"
          value={rulesJson}
          onChange={(e) => onRulesChange(e.target.value)}
          placeholder='{\n  "ventures": ["venture1", "venture2"],\n  "rules": [...]\n}'
        />
      </div>

      {rulesError && (
        <div className="alert alert-error">
          <strong>Validation Error:</strong> {rulesError}
        </div>
      )}

      {rulesFile && !rulesError && (
        <div className="alert alert-success">
          ✓ Rules validated: {rulesFile.ventures?.length || 0} venture
          {(rulesFile.ventures?.length || 0) !== 1 ? 's' : ''}, {rulesFile.rules?.length || 0} rule
          {(rulesFile.rules?.length || 0) !== 1 ? 's' : ''}
        </div>
      )}

      {!rulesJson && !rulesError && (
        <div className="alert alert-info">
          <strong>Tip:</strong> Click "Load Example" to see the rules format, or upload your own rules JSON file.
        </div>
      )}
    </div>
  )
}

export default RulesSection
