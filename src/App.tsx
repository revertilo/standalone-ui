import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'

interface StageMessage {
  type: 'stage'
  stage: string
  timestamp: string
}

interface ErrorMessage {
  type: 'script_error'
  script: string
  status: 'error'
  return_code: number
  timestamp: string
}

interface CompleteMessage {
  type: 'complete'
  message: string
  data: string
}

type AnalysisMessage = StageMessage | ErrorMessage | CompleteMessage

function App() {
  const [activeTab, setActiveTab] = useState<'trace' | 'simulate'>('trace')
  const [txHash, setTxHash] = useState('0x68109266feca2865beca5c3a2c38465f0330e60407edb2fafef07407bb7585aa')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStage, setCurrentStage] = useState<string>('')
  const [analysisError, setAnalysisError] = useState<string>('')
  const [analysisComplete, setAnalysisComplete] = useState<string>('')
  const [contractAddress, setContractAddress] = useState<string>('0x1111111254EEB25477B68fb85Ed929f73A960582')
  const [fromAddress, setFromAddress] = useState<string>('0x4ac3dC4F8986d77D3d589DAa074f040b701D752a')
  const [value, setValue] = useState<string>('0x0')
  const [bytecode, setBytecode] = useState<string>('0x12aa3caf0000000000000000000000005141b82f5ffda4c6fe1e372978f1c5427640a1900000000000000000000000004d4574f50dd8b9dbe623cf329dcc78d76935e610000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000005141b82f5ffda4c6fe1e372978f1c5427640a1900000000000000000000000004ac3dc4f8986d77d3d589daa074f040b701d752a00000000000000000000000000000000000000000000000000c6cec41267a9be00000000000000000000000000000000000000000000000000071a96e6fa30a80000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000018300000000000000000000000000000000016500014f0001050000c900004e00a0744c8c094d4574f50dd8b9dbe623cf329dcc78d76935e610382ffce2287252f930e1c8dc9328dac5bf282ba10000000000000000000000000000000000000000000000000001fcf299c8b7750c204d4574f50dd8b9dbe623cf329dcc78d76935e610055fb841cce69000fbaff2691ad39fa6e23826a16ae4071198002dc6c0055fb841cce69000fbaff2691ad39fa6e23826a100000000000000000000000000000000000000000000000000071a96e6fa30a84d4574f50dd8b9dbe623cf329dcc78d76935e6104101c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200042e1a7d4d000000000000000000000000000000000000000000000000000000000000000000a0f2fa6b66eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000752d5a195b8c30000000000000000000701124fca6fa3c0611111111254eeb25477b68fb85ed929f73a96058200000000000000000000000000000000000000000000000000000000009a635db5')
  const [isSimulating, setIsSimulating] = useState(false)
  const [currentSimulationStage, setCurrentSimulationStage] = useState<string>('')
  const [simulationError, setSimulationError] = useState<string>('')
  const [simulationComplete, setSimulationComplete] = useState<string>('')
  const [funnyMessageIndex, setFunnyMessageIndex] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const simulationWsRef = useRef<WebSocket | null>(null)
  const funnyMessageIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const funnyMessages = [
    "Asking Sam Altman for advice...",
    "Bribing block builders with coffee...",
    "Teaching AI the difference between revert and require...",
    "Convincing Vitalik to explain the transaction...",
    "Reading Satoshi's original white paper...",
    "Asking ChatGPT if it's smarter than GPT-4...",
    "Summoning the spirit of Hal Finney...",
    "Debugging smart contracts with rubber ducks...",
    "Converting gas fees to pizza slices for better understanding...",
    "Teaching the AI to count in wei...",
    "Asking Stack Overflow for transaction help...",
    "Consulting the Ethereum Yellow Paper (again)...",
    "Deciphering what the smart contract author meant...",
    "Explaining to AI why gas costs so much...",
    "Teaching machine learning about human learning curves...",
    "Converting transaction logs to haikus...",
    "Asking Ethereum if it's feeling okay today...",
    "Consulting the blockchain gods for wisdom..."
  ]

  // Effect to handle funny message rotation during AI analysis
  useEffect(() => {
    const isAIAnalyzing = (currentStage.toLowerCase().includes('ai')) || (currentSimulationStage.toLowerCase().includes('ai'))
    
    if (isAIAnalyzing) {
      // Start the interval to rotate messages every 3 seconds (3,000 ms)
      funnyMessageIntervalRef.current = setInterval(() => {
        setFunnyMessageIndex(prevIndex => (prevIndex + 1) % funnyMessages.length)
      }, 3000)
    } else {
      // Clear interval when not in AI analysis
      if (funnyMessageIntervalRef.current) {
        clearInterval(funnyMessageIntervalRef.current)
        funnyMessageIntervalRef.current = null
      }
      // Reset to first message
      setFunnyMessageIndex(0)
    }

    // Cleanup interval on unmount
    return () => {
      if (funnyMessageIntervalRef.current) {
        clearInterval(funnyMessageIntervalRef.current)
      }
    }
  }, [currentStage, currentSimulationStage, funnyMessages.length])

  const handleAnalyze = () => {
    if (!txHash.trim()) return

    setIsAnalyzing(true)
    setCurrentStage('')
    setAnalysisError('')
    setAnalysisComplete('')

    // Create WebSocket connection
    const ws = new WebSocket('ws://127.0.0.1:8765')
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      
      // Send the start message
      const message = {
        action: "start",
        txHash: txHash.trim()
      }
      
      ws.send(JSON.stringify(message))
      console.log('Sent message:', message)
    }

    ws.onmessage = (event) => {
      try {
        const data: AnalysisMessage = JSON.parse(event.data)
        console.log('Received message:', data)
        
        if (data.type === 'stage') {
          setCurrentStage(data.stage)
          setAnalysisError('') // Clear any previous errors
        } else if (data.type === 'script_error') {
          setAnalysisError(`Error in ${data.script}: Script failed with code ${data.return_code}`)
          setCurrentStage('')
          setIsAnalyzing(false) // Stop the analysis on error
        } else if (data.type === 'complete') {
          setAnalysisComplete(data.data)
          setCurrentStage('')
          setIsAnalyzing(false) // Analysis is complete
        }
      } catch {
        console.log('Received raw message:', event.data)
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      setIsAnalyzing(false)
      setCurrentStage('')
      wsRef.current = null
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsAnalyzing(false)
      setAnalysisError('WebSocket connection failed')
    }
  }

  const handleStop = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
  }

  const handleSimulate = () => {
    if (!contractAddress.trim() || !fromAddress.trim() || !bytecode.trim()) return

    setIsSimulating(true)
    setCurrentSimulationStage('')
    setSimulationError('')
    setSimulationComplete('')

    // Create WebSocket connection
    const ws = new WebSocket('ws://127.0.0.1:8765')
    simulationWsRef.current = ws

    ws.onopen = () => {
      console.log('Simulation WebSocket connected')
      
      // Send the emulate message
      const message = {
        action: "emulate",
        from: fromAddress.trim(),
        to: contractAddress.trim(),
        data: bytecode.trim(),
        value: value.trim()
      }
      
      ws.send(JSON.stringify(message))
      console.log('Sent simulation message:', message)
    }

    ws.onmessage = (event) => {
      try {
        const data: AnalysisMessage = JSON.parse(event.data)
        console.log('Received simulation message:', data)
        
        if (data.type === 'stage') {
          setCurrentSimulationStage(data.stage)
          setSimulationError('') // Clear any previous errors
        } else if (data.type === 'script_error') {
          setSimulationError(`Error in ${data.script}: Script failed with code ${data.return_code}`)
          setCurrentSimulationStage('')
          setIsSimulating(false) // Stop the simulation on error
        } else if (data.type === 'complete') {
          setSimulationComplete(data.data)
          setCurrentSimulationStage('')
          setIsSimulating(false) // Simulation is complete
        }
      } catch {
        console.log('Received raw simulation message:', event.data)
      }
    }

    ws.onclose = (event) => {
      console.log('Simulation WebSocket closed:', event.code, event.reason)
      setIsSimulating(false)
      setCurrentSimulationStage('')
      simulationWsRef.current = null
    }

    ws.onerror = (error) => {
      console.error('Simulation WebSocket error:', error)
      setIsSimulating(false)
      setSimulationError('WebSocket connection failed')
    }
  }

  const handleStopSimulation = () => {
    if (simulationWsRef.current) {
      simulationWsRef.current.close()
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">Revertilo</h1>
        <p className="subtitle">
          Friendly debugging tool for <span className="annoying-reverts">annoying reverts</span>
        </p>
      </header>

      <nav className="tabs">
        <button 
          className={`tab ${activeTab === 'trace' ? 'active' : ''}`}
          onClick={() => setActiveTab('trace')}
        >
          Trace
        </button>
        <button 
          className={`tab ${activeTab === 'simulate' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulate')}
        >
          Simulate
        </button>
      </nav>

      <main className="content">
        {activeTab === 'trace' && (
          <div className="trace-section">
            <h2>Transaction Tracer</h2>

            <div className="input-group">
              <input
                type="text"
                placeholder="Enter transaction hash (0x...)"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="tx-input"
                disabled={isAnalyzing}
              />
              <div className="button-group">
                <button 
                  onClick={handleAnalyze}
                  disabled={!txHash.trim() || isAnalyzing}
                  className="analyze-button"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                </button>
                {isAnalyzing && (
                  <button 
                    onClick={handleStop}
                    className="stop-button"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>

            {isAnalyzing && (
              <div className="analysis-status">
                {currentStage && (
                  <div className="current-stage">
                    <div className="stage-indicator">
                      <div className="loading-spinner"></div>
                      <span className="stage-text">{currentStage}</span>
                    </div>
                    {currentStage.toLowerCase().includes('ai') && (
                      <div className="stage-info">
                        {funnyMessages[funnyMessageIndex]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {analysisError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{analysisError}</span>
              </div>
            )}

            {analysisComplete && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                <span className="success-text">Analysis completed successfully!</span>
                <div className="report-content">
                  <ReactMarkdown>{analysisComplete}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'simulate' && (
          <div className="simulate-section">
            <h2>Transaction Simulator</h2>
            
            <div className="transaction-fields">
              <div className="field-group">
                <label htmlFor="from-address" className="field-label">
                  From Address:
                </label>
                <input
                  id="from-address"
                  type="text"
                  placeholder="0x..."
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  className="address-input"
                  disabled={isSimulating}
                />
              </div>

              <div className="field-group">
                <label htmlFor="contract-address" className="field-label">
                  To Address:
                </label>
                <input
                  id="contract-address"
                  type="text"
                  placeholder="0x..."
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="address-input"
                  disabled={isSimulating}
                />
              </div>

              <div className="field-group">
                <label htmlFor="value" className="field-label">
                  Value (ETH):
                </label>
                <input
                  id="value"
                  type="text"
                  placeholder="0x0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="value-input"
                  disabled={isSimulating}
                />
              </div>

              <div className="field-group">
                <label htmlFor="bytecode" className="field-label">
                  Calldata:
                </label>
                <textarea
                  id="bytecode"
                  placeholder="0x..."
                  value={bytecode}
                  onChange={(e) => setBytecode(e.target.value)}
                  className="bytecode-input"
                  rows={4}
                  disabled={isSimulating}
                />
              </div>
            </div>

            <div className="simulate-actions">
              <button 
                className="simulate-button"
                onClick={handleSimulate}
                disabled={!contractAddress.trim() || !fromAddress.trim() || !bytecode.trim() || isSimulating}
              >
                {isSimulating ? 'Simulating...' : 'Simulate'}
              </button>
              {isSimulating && (
                <button 
                  onClick={handleStopSimulation}
                  className="stop-button"
                >
                  Stop
                </button>
              )}
            </div>

            {isSimulating && (
              <div className="analysis-status">
                {currentSimulationStage && (
                  <div className="current-stage">
                    <div className="stage-indicator">
                      <div className="loading-spinner"></div>
                      <span className="stage-text">{currentSimulationStage}</span>
                    </div>
                    {currentSimulationStage.toLowerCase().includes('ai') && (
                      <div className="stage-info">
                        {funnyMessages[funnyMessageIndex]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {simulationError && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{simulationError}</span>
              </div>
            )}

            {simulationComplete && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                <span className="success-text">Simulation completed successfully!</span>
                <div className="report-content">
                  <ReactMarkdown>{simulationComplete}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App