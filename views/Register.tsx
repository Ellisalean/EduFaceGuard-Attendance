import React, { useState, useRef, useEffect } from 'react';
import { Camera, Save, User as UserIcon, Shield, RotateCcw, SwitchCamera } from 'lucide-react';
import { faceService } from '../services/faceService';
import { StorageService } from '../services/storageService';
import { User, UserRole } from '../types';

const Register: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<User>>({ role: UserRole.STUDENT });
  const [captures, setCaptures] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [descriptors, setDescriptors] = useState<Float32Array[]>([]);
  const [profileImg, setProfileImg] = useState<string | null>(null);
  
  // Camera State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Constants
  const ADMIN_PIN = '1234'; // Simple for demo
  const REQUIRED_CAPTURES = 5;

  useEffect(() => {
    if (isAuthenticated) {
      startCamera();
      faceService.loadModels(); // Ensure models loaded
    }
    return () => stopCamera();
  }, [isAuthenticated, facingMode]); // Restart when mode changes

  const startCamera = async () => {
    stopCamera(); // Ensure clean switch
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode } 
      });
      if (videoRef.current) {
         videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) setIsAuthenticated(true);
    else alert('Invalid PIN');
  };

  const handleCapture = async () => {
    if (!videoRef.current || isProcessing) return;
    setIsProcessing(true);

    try {
      const detection = await faceService.detectFace(videoRef.current);
      if (detection) {
        setDescriptors(prev => [...prev, detection.descriptor]);
        setCaptures(prev => prev + 1);
        
        // Capture first frame as profile image - OPTIMIZED FOR STORAGE
        if (!profileImg) {
          const canvas = document.createElement('canvas');
          // Scale down to a thumbnail size (e.g., 200px width) to save localStorage space
          const scaleFactor = 200 / videoRef.current.videoWidth;
          canvas.width = videoRef.current.videoWidth * scaleFactor;
          canvas.height = videoRef.current.videoHeight * scaleFactor;
          
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
             // If user mode, flip horizontally for natural look in image
             if (facingMode === 'user') {
                 ctx.translate(canvas.width, 0);
                 ctx.scale(-1, 1);
             }
             // Draw scaled image
             ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
             
             // High compression JPEG (0.6 quality)
             setProfileImg(canvas.toDataURL('image/jpeg', 0.6));
          }
        }

      } else {
        alert("No se detectó rostro. Por favor mire a la cámara.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveUser = () => {
    if (!formData.fullName || !formData.id || !formData.courseOrDept) {
      alert("Por favor complete todos los campos");
      return;
    }
    if (captures < REQUIRED_CAPTURES) {
      alert(`Por favor capture al menos ${REQUIRED_CAPTURES} ángulos.`);
      return;
    }

    const newUser: User = {
      id: formData.id,
      fullName: formData.fullName,
      role: formData.role as UserRole,
      courseOrDept: formData.courseOrDept,
      registeredAt: new Date().toISOString(),
      profileImage: profileImg || undefined,
    };

    try {
        StorageService.saveUser(newUser);
        StorageService.addFaceDescriptor({
        label: newUser.id,
        descriptors: descriptors
        });

        // Reset
        faceService.loadMatcherFromStorage(); // Reload matcher
        alert("¡Usuario registrado exitosamente!");
        setFormData({ role: UserRole.STUDENT, fullName: '', id: '', courseOrDept: '' });
        setCaptures(0);
        setDescriptors([]);
        setProfileImg(null);
    } catch (error) {
        alert("Error: Memoria llena. Intente borrar usuarios antiguos.");
        console.error(error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
          <Shield className="w-16 h-16 text-brand-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acceso Administrativo</h2>
          <p className="text-gray-500 mb-6">Ingrese el PIN para registrar nuevos usuarios.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 border rounded-lg text-center text-2xl tracking-widest"
              placeholder="••••"
              maxLength={4}
            />
            <button
              type="submit"
              className="w-full bg-brand-600 text-white py-3 rounded-lg font-semibold hover:bg-brand-700 transition"
            >
              Desbloquear
            </button>
            <p className="text-xs text-gray-400 mt-4">Pista: Use '1234' para la demo.</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Form Section */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
            <UserIcon className="mr-2" />
            Datos del Usuario
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={formData.fullName || ''}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Ej. Juan Pérez"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de ID</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                  value={formData.id || ''}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="Ej. E-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.STUDENT}>Estudiante</option>
                  <option value={UserRole.TEACHER}>Profesor</option>
                  <option value={UserRole.STAFF}>Personal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curso / Departamento</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                value={formData.courseOrDept || ''}
                onChange={(e) => setFormData({ ...formData, courseOrDept: e.target.value })}
                placeholder="Ej. Ingeniería de Sistemas"
              />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          <strong>Consejo:</strong> Asegure una buena iluminación. Pida al usuario que gire la cabeza lentamente hacia la izquierda, derecha y centro.
        </div>
      </div>

      {/* Camera Section */}
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
            />
            
            {/* Camera Controls Overlay */}
            <div className="absolute top-2 right-2">
                 <button 
                    onClick={toggleCamera}
                    className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                    title="Cambiar Cámara"
                 >
                    <SwitchCamera size={20} />
                 </button>
            </div>

            {/* Capture Progress Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-center text-white text-sm">
              Capturas: <span className="font-bold text-brand-400">{captures}</span> / {REQUIRED_CAPTURES}
            </div>
          </div>

          <div className="flex space-x-4 w-full">
            <button
              onClick={handleCapture}
              disabled={captures >= REQUIRED_CAPTURES || isProcessing}
              className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center space-x-2 transition ${
                captures >= REQUIRED_CAPTURES 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              <Camera size={20} />
              <span>{isProcessing ? 'Procesando...' : 'Capturar Rostro'}</span>
            </button>

            <button
              onClick={() => { setCaptures(0); setDescriptors([]); setProfileImg(null); }}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              title="Reiniciar Capturas"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        <button
          onClick={handleSaveUser}
          disabled={captures < REQUIRED_CAPTURES}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 shadow-lg transition ${
            captures < REQUIRED_CAPTURES
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-school-green text-white hover:opacity-90'
          }`}
        >
          <Save size={24} />
          <span>Completar Registro</span>
        </button>
      </div>

    </div>
  );
};

export default Register;