import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertTriangle, User, RefreshCw, Clock, ShieldCheck, Loader2, SwitchCamera } from 'lucide-react';
import { faceService } from '../services/faceService';
import { StorageService } from '../services/storageService';
import { AttendanceType, User as UserType, AttendanceRecord } from '../types';

const LOGO_URL = "https://cdn.myportfolio.com/d435fa58-d32c-4141-8a15-0f2bfccdea41/1ac05fb8-e508-4c03-b550-d2b907caadbd_rw_600.png?h=7572d326e4292f32557ac73606fd0ece";
const SCREENSAVER_TIMEOUT_MS = 15000; // Increased to 15s for mobile ease of use
const FACE_LOSS_GRACE_PERIOD_MS = 2000;

const Scanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // UI State
  const [isSystemReady, setIsSystemReady] = useState(false); // Models + Camera ready
  const [error, setError] = useState<string | null>(null);
  const [detectedUser, setDetectedUser] = useState<UserType | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'success' | 'already-checked-in' | null>(null);
  const [isScreensaverActive, setIsScreensaverActive] = useState(true);
  
  // Camera State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Logic Refs (Mutable state for the loop)
  const stateRef = useRef({
    detectedUser: null as UserType | null,
    isScreensaverActive: true,
    lastFaceDetectedTime: Date.now(),
    isProcessingMatch: false
  });
  
  // Timer Ref (Browser setTimeout returns number)
  const clearUserTimerRef = useRef<number | null>(null);

  // Initialize System
  useEffect(() => {
    let isActive = true;
    let animationFrameId: number;
    let stream: MediaStream | null = null;

    // Reset ready state when camera changes
    setIsSystemReady(false);

    const startSystem = async () => {
      try {
        await faceService.loadModels();
        
        if (!isActive) return;

        // Request camera with specific constraints based on facingMode
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480, 
              facingMode: facingMode // Dynamic facing mode
            } 
        });
        
        if (!isActive) {
           // Component unmounted during await, clean up immediately
           stream.getTracks().forEach(t => t.stop());
           return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // IMPORTANT: Wait for 'onplaying' to ensure video has actual data
          videoRef.current.onplaying = () => {
            if (isActive) {
                setIsSystemReady(true);
                loop(); 
            }
          };
          
          // Play and handle potential interruption
          videoRef.current.play().catch(e => {
              console.warn("Video play failed/interrupted", e);
          });
        }
      } catch (err) {
        console.error(err);
        if (isActive) setError("Error: No se pudo acceder a la cámara o cargar IA.");
      }
    };

    const loop = async () => {
      if (!isActive) return;
      await processFrame();
      if (isActive) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    startSystem();

    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrameId);
      if (clearUserTimerRef.current) clearTimeout(clearUserTimerRef.current);
      
      // Stop Camera tracks thoroughly
      if (stream) {
          stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
    };
  }, [facingMode]); // Re-run effect when facingMode changes

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Frame Processing Logic
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    
    // STRICT SAFETY CHECK
    if (video.paused || video.ended || video.readyState < 3 || video.videoWidth < 1) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas if needed
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    if (canvas.width !== displaySize.width) {
      canvas.width = displaySize.width;
      canvas.height = displaySize.height;
    }

    try {
      const detection = await faceService.detectFace(video);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        // --- FACE FOUND ---
        stateRef.current.lastFaceDetectedTime = Date.now();
        
        // Disable screensaver immediately
        if (stateRef.current.isScreensaverActive) {
           stateRef.current.isScreensaverActive = false;
           setIsScreensaverActive(false);
        }

        // Clear "grace period" timer if it exists
        if (clearUserTimerRef.current) {
          clearTimeout(clearUserTimerRef.current);
          clearUserTimerRef.current = null;
        }

        const { box } = detection.detection;
        const isLive = faceService.checkLiveness(detection);

        // Draw visuals
        ctx.lineWidth = 4;
        if (isLive) {
          ctx.strokeStyle = '#10b981';
          const { label } = faceService.identifyFace(detection.descriptor);
          
          if (label !== 'unknown') {
            ctx.fillStyle = '#10b981';
            ctx.fillRect(box.x, box.y - 30, box.width, 30);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Inter';
            ctx.fillText(label, box.x + 10, box.y - 10);
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            handleMatch(label);
          } else {
             ctx.strokeStyle = '#64748b';
             ctx.strokeRect(box.x, box.y, box.width, box.height);
          }
        } else {
           ctx.strokeStyle = '#f59e0b';
           ctx.strokeRect(box.x, box.y, box.width, box.height);
           ctx.fillStyle = '#f59e0b';
           ctx.font = '14px Inter';
           ctx.fillText('...', box.x, box.y - 10);
        }

      } else {
        // --- NO FACE ---
        
        // 1. Grace Period (Anti-flicker)
        if (stateRef.current.detectedUser && !clearUserTimerRef.current) {
          clearUserTimerRef.current = window.setTimeout(() => {
             stateRef.current.detectedUser = null;
             setDetectedUser(null);
             setAttendanceStatus(null);
             clearUserTimerRef.current = null;
          }, FACE_LOSS_GRACE_PERIOD_MS);
        }

        // 2. Activate Screensaver
        const idleTime = Date.now() - stateRef.current.lastFaceDetectedTime;
        if (!stateRef.current.isScreensaverActive && !stateRef.current.detectedUser && idleTime > SCREENSAVER_TIMEOUT_MS) {
           stateRef.current.isScreensaverActive = true;
           setIsScreensaverActive(true);
        }
      }

    } catch (e) {
      console.error("Frame processing error", e);
    }
  };

  const handleMatch = (userId: string) => {
    // Current active user check
    if (stateRef.current.detectedUser && stateRef.current.detectedUser.id === userId) return;
    
    // Processing lock check
    if (stateRef.current.isProcessingMatch) return;
    
    stateRef.current.isProcessingMatch = true;

    const users = StorageService.getUsers();
    const user = users.find(u => u.id === userId);

    if (user) {
      stateRef.current.detectedUser = user;
      setDetectedUser(user);
      checkAndLogAttendance(user);
    }

    // Unlock after 1s
    setTimeout(() => {
        stateRef.current.isProcessingMatch = false;
    }, 1000);
  };

  const checkAndLogAttendance = (user: UserType) => {
    try {
      const allLogs = StorageService.getAttendance();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const alreadyCheckedIn = allLogs.some(log => {
        const logDate = new Date(log.timestamp);
        return log.userId === user.id && logDate >= today;
      });

      if (alreadyCheckedIn) {
        setAttendanceStatus('already-checked-in');
        playSound('error'); 
      } else {
        const newRecord: AttendanceRecord = {
          id: crypto.randomUUID(),
          userId: user.id,
          userName: user.fullName,
          userRole: user.role,
          course: user.courseOrDept,
          timestamp: new Date().toISOString(),
          type: AttendanceType.CHECK_IN
        };
        
        StorageService.logAttendance(newRecord);
        setAttendanceStatus('success');
        playSound('success');
      }
    } catch (err) {
      console.error("Storage error", err);
    }
  };

  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
        setTimeout(() => {
           const osc2 = ctx.createOscillator();
           const gain2 = ctx.createGain();
           osc2.connect(gain2);
           gain2.connect(ctx.destination);
           osc2.type = 'triangle';
           osc2.frequency.setValueAtTime(440, ctx.currentTime);
           osc2.start();
           osc2.stop(ctx.currentTime + 0.1);
        }, 150);
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-900 relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* 1. SCREENSAVER LAYER */}
      <div 
        className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${isScreensaverActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="flex flex-col items-center p-8 text-center">
            <img 
                src={LOGO_URL} 
                alt="Institute Logo" 
                className="w-64 h-auto mb-8 drop-shadow-2xl"
            />
            <h1 className="text-4xl font-bold text-gray-800 tracking-tight">EduFaceGuard</h1>
            
            {!isSystemReady && !error ? (
                <div className="mt-8 flex flex-col items-center text-brand-600">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="font-medium animate-pulse">Iniciando sistema y cámara...</p>
                </div>
            ) : error ? (
                 <div className="mt-8 text-red-500 bg-red-50 p-4 rounded-lg">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p className="font-bold">{error}</p>
                 </div>
            ) : (
                <>
                  <p className="text-xl text-gray-500 mt-4">Sistema de Control de Asistencia Seguro</p>
                  <div className="mt-12 flex items-center text-brand-600 bg-brand-50 px-6 py-3 rounded-full shadow-sm animate-pulse">
                      <ShieldCheck className="mr-2 h-6 w-6" />
                      <span className="font-semibold">Acérquese para registrar asistencia</span>
                  </div>
                </>
            )}
        </div>
      </div>

      {/* 2. CAMERA LAYER */}
      <div className="relative w-full max-w-4xl aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800">
        
        {!isSystemReady && !isScreensaverActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-20">
            <RefreshCw className="animate-spin w-8 h-8 mr-2" />
            <span>Cargando...</span>
          </div>
        )}

        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
        />

        {/* Live Indicator & Controls */}
        <div className="absolute top-4 right-4 z-10 flex space-x-2">
           <button 
             onClick={toggleCamera}
             className="bg-black/50 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/70 border border-white/20 transition-all"
             title="Cambiar Cámara"
           >
             <SwitchCamera size={18} />
           </button>

          <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-sm font-semibold text-white flex items-center border border-white/20">
            <div className={`w-2 h-2 rounded-full mr-2 ${isSystemReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isSystemReady ? 'Sistema Activo' : 'Iniciando...'}
          </div>
        </div>
      </div>

      {/* 3. USER FEEDBACK CARD */}
      {!isScreensaverActive && detectedUser && (
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-50">
            <div className={`bg-white rounded-2xl shadow-2xl p-6 flex items-center space-x-6 border-l-8 animate-bounce-in ${attendanceStatus === 'success' ? 'border-green-500' : 'border-blue-500'}`}>
            
            <div className="relative">
                {detectedUser.profileImage ? (
                    <img src={detectedUser.profileImage} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-100" />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 ring-4 ring-gray-100">
                    <User size={40} />
                    </div>
                )}
                <div className={`absolute bottom-0 right-0 p-1 rounded-full text-white ${attendanceStatus === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
                    {attendanceStatus === 'success' ? <CheckCircle size={16} /> : <Clock size={16} />}
                </div>
            </div>

            <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 leading-tight">{detectedUser.fullName}</h3>
                <p className="text-gray-500 font-medium">{detectedUser.role}</p>
                <p className="text-gray-400 text-sm">{detectedUser.courseOrDept}</p>
                
                <div className={`mt-2 inline-flex items-center text-sm font-bold px-3 py-1 rounded-full ${
                    attendanceStatus === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                    {attendanceStatus === 'success' ? 'ASISTENCIA REGISTRADA' : 'YA REGISTRADO HOY'}
                </div>
            </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Scanner;