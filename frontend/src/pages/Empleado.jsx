import React, { useEffect, useRef, useState } from 'react'
import './Empleado.css'
import { FaCamera, FaQrcode, FaCheckCircle, FaBan, FaSpinner } from 'react-icons/fa'

function Empleado() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)
  const [mode, setMode] = useState('idle') // 'idle' | 'qr' | 'selfie'
  const [qrResult, setQrResult] = useState(null)
  const [selfieData, setSelfieData] = useState(null)
  const [cameraPermission, setCameraPermission] = useState('unknown') // 'unknown'|'granted'|'denied'|'prompt'
  const [isStarting, setIsStarting] = useState(false)
  const rafRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    async function getDevices() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = list.filter((d) => d.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId)
        }
      } catch (e) {
        console.error('No se pudieron enumerar dispositivos', e)
      }
    }

    async function checkPerm() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const p = await navigator.permissions.query({ name: 'camera' })
          setCameraPermission(p.state)
          p.onchange = () => setCameraPermission(p.state)
        }
      } catch (e) {
        // no permission API
      }
    }

    getDevices()
    checkPerm()

    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const startStream = async (deviceId) => {
    stopStream()
    setIsStarting(true)
    try {
      const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setCameraPermission('granted')
      setIsStarting(false)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (e) {
      setIsStarting(false)
      if (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) {
        setCameraPermission('denied')
      }
      console.error('Error arrancando la cámara', e)
      alert('No se pudo acceder a la cámara. Revisa permisos en tu navegador.')
    }
  }

  const handleDeviceChange = async (e) => {
    const id = e.target.value
    setSelectedDeviceId(id)
    await startStream(id)
  }

  const startQR = async () => {
    setQrResult(null)
    setMode('qr')
    // try to start stream (will request permission if needed)
    await startStream(selectedDeviceId)
    scanLoop()
  }

  const scanLoop = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Prefer BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const barcodes = await detector.detect(canvas)
        if (barcodes && barcodes.length) {
          setQrResult(barcodes[0].rawValue)
          setMode('idle')
          stopStream()
          return
        }
      } catch (e) {
        console.warn('BarcodeDetector error', e)
      }
    } else {
      // Fallback: show message (robust QR decoding needs external lib like jsQR)
    }

    rafRef.current = requestAnimationFrame(scanLoop)
  }

  const stopQR = () => {
    setMode('idle')
    stopStream()
  }

  const captureSelfie = async () => {
    setMode('selfie')
    await startStream(selectedDeviceId)
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/png')
    setSelfieData(data)
    stopStream()
  }

  const downloadSelfie = () => {
    if (!selfieData) return
    const a = document.createElement('a')
    a.href = selfieData
    a.download = `selfie_${Date.now()}.png`
    a.click()
  }

  return (
    <div className="empleado-page">
      <div className="empleado-container">
        <div className="empleado-header">
          <div>
            <h1>Pantalla Empleado</h1>
            <div className="empleado-sub">Marca tu asistencia: escanea QR o toma una selfie.</div>
          </div>

          <div className="permission-status">
            {isStarting ? (
              <div className="perm-item"><FaSpinner className="spin"/> Solicitando cámara...</div>
            ) : cameraPermission === 'granted' ? (
              <div className="perm-item"><FaCheckCircle/> Cámara autorizada</div>
            ) : cameraPermission === 'denied' ? (
              <div className="perm-item"><FaBan/> Cámara denegada</div>
            ) : (
              <div className="perm-item">Estado de cámara: {cameraPermission}</div>
            )}
          </div>
        </div>

        <div className="controls">
          <label>Seleccionar cámara:</label>
          <select value={selectedDeviceId || ''} onChange={handleDeviceChange}>
            {devices.map((d) => (
              <option value={d.deviceId} key={d.deviceId}>
                {d.label || `Cámara ${d.deviceId}`}
              </option>
            ))}
          </select>

          <div className="buttons">
            <button onClick={startQR} className="btn"><FaQrcode style={{marginRight:8}}/>Escanear QR</button>
            <button onClick={stopQR} className="btn btn-secondary"><FaBan style={{marginRight:8}}/>Detener</button>
            <button onClick={captureSelfie} className="btn"><FaCamera style={{marginRight:8}}/>Tomar selfie</button>
            <button onClick={downloadSelfie} className="btn" disabled={!selfieData}>Descargar selfie</button>
          </div>
        </div>

        <div className="camera-area">
          <div className="camera-card camera-overlay">
            <video ref={videoRef} className="camera-video" playsInline muted />
            <div className="qr-frame" aria-hidden />
            <canvas ref={canvasRef} className="camera-canvas" style={{ display: 'none' }} />
          </div>

          <div className="sidebar-card">
            <h3>Resultados</h3>
            <div className="results">
              <div className="qr-result" style={{flex:1}}>
                <h4>Resultado QR</h4>
                {qrResult ? <pre className="qr-value">{qrResult}</pre> : <p className="empleado-sub">No detectado aún.</p>}
              </div>

              <div className="selfie-result" style={{width:120}}>
                <h4>Selfie</h4>
                {selfieData ? (
                  <img src={selfieData} alt="Selfie" className="selfie-preview" />
                ) : (
                  <p className="empleado-sub">No hay selfie capturada.</p>
                )}
              </div>
            </div>

            <div className="help">
              <p className="empleado-sub">Si la cámara no funciona, revisa permisos del navegador y recarga la página.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Empleado