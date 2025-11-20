import { useState } from 'react'
import axios from 'axios'
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [downloadName, setDownloadName] = useState("improved_code.txt")
  const [copySuccess, setCopySuccess] = useState(false)

  // Ensure this matches your Render/Local URL
  const API_URL = "https://code-janitor-api.onrender.com" 

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
    setCode("") 
    setError("")
  }

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_URL}/refactor`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setCode(response.data.improved_code);
      setDownloadName(response.data.filename); 

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to connect to the Janitor backend.");
    } finally {
      setLoading(false);
    }
  }

  const downloadCode = () => {
    const element = document.createElement("a");
    const fileData = new Blob([code], {type: 'text/plain'});
    element.href = URL.createObjectURL(fileData);
    element.download = downloadName; 
    document.body.appendChild(element);
    element.click();
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }

  return (
    <div className="app-container">
      <div className={`main-layout ${code ? 'split-view' : 'centered-view'}`}>
        
        {/* LEFT CARD: Input */}
        <div className="glass-card input-panel">
          <header>
            <div className="logo-wrapper">
              <span className="icon-badge">🧙‍♂️</span>
            </div>
            <h1>Code Alchemy</h1>
            <p className="subtitle">AI-Powered Refactoring Engine</p>
          </header>
          
          <div className="upload-section">
            <div className={`drop-zone ${file ? 'active' : ''}`}>
              <input type="file" id="fileInput" onChange={handleFileChange} />
              <label htmlFor="fileInput">
                {file ? (
                  <div className="file-info">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{file.name}</span>
                    <span className="file-change-text">Click to change</span>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <span className="icon">☁️</span>
                    <span>Drop your messy file here</span>
                    <span className="sub-text">Supports .py, .js, .java, .cpp</span>
                  </div>
                )}
              </label>
            </div>

            <button 
              className="cta-button" 
              onClick={handleUpload} 
              disabled={!file || loading}
            >
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <span>Refactoring...</span>
                </div>
              ) : (
                "✨ Magic Fix"
              )}
            </button>
          </div>

          {error && <div className="error-banner">🚨 {error}</div>}
        </div>

        {/* RIGHT CARD: Output */}
        {code && (
          <div className="glass-card output-panel">
            <div className="panel-header">
              <div className="header-left">
                {/* UPDATED SECTION START */}
                <h3>Refactored Result</h3>
                <span className="badge">{downloadName}</span>
                {/* UPDATED SECTION END */}
              </div>
              <div className="header-actions">
                <button className="icon-btn" onClick={copyToClipboard} title="Copy Code">
                   {copySuccess ? "✅" : "📋"}
                </button>
                <button className="primary-btn-small" onClick={downloadCode}>
                  Download
                </button>
              </div>
            </div>
            
            <div className="editor-window">
              <div className="window-bar">
                <div className="traffic-lights">
                  <span className="light red"></span>
                  <span className="light yellow"></span>
                  <span className="light green"></span>
                </div>
                {/* Removed the duplicate filename here to keep it clean */}
                <span className="filename-display">read-only</span>
              </div>
              <div className="code-scroll-area">
                <SyntaxHighlighter 
                  language="python" 
                  style={atomOneDark} 
                  customStyle={{
                    background: 'transparent', 
                    padding: '1.5rem',
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                  }}
                  showLineNumbers={true}
                  wrapLongLines={true}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
