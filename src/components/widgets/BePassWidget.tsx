import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Lock,
  Fingerprint,
  ScanFace,
  Delete,
  CheckCircle2,
  Camera,
  RotateCcw,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import {
  hapticTap,
  hapticKeypadPress,
  hapticSuccess,
  hapticWarning,
  hapticConfirm,
} from '../../utils/haptics';

export interface BiometricActionTrigger {
  type: 'face' | 'fingerprint';
  nonce: number;
}

interface BePassWidgetProps {
  onSuccess: () => void;
  onCancel: () => void;
  isCompleted?: boolean;
  externalBiometricAction?: BiometricActionTrigger | null;
}

type AuthMode = 'pin' | 'face';
type FaceScanStatus = 'starting' | 'scanning' | 'low_light' | 'detected' | 'confirmed' | 'error';

export const BePassWidget: React.FC<BePassWidgetProps> = ({
  onSuccess,
  onCancel,
  isCompleted,
  externalBiometricAction,
}) => {
  const [pin, setPin] = useState<string>('');
  const [authMode, setAuthMode] = useState<AuthMode>('pin');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Estado para verificación facial en vivo con cámara frontal
  const [faceStatus, setFaceStatus] = useState<FaceScanStatus>('starting');
  const [faceProgress, setFaceProgress] = useState<number>(0);
  const [faceError, setFaceError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastProcessedNonceRef = useRef<number>(0);
  const verificationTriggeredRef = useRef<boolean>(false);

  // Detener cámara y temporizadores de escaneo de forma inmediata y segura
  const stopFaceCamera = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignorar errores al detener pista
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (
      authMode === 'face' &&
      faceStatus !== 'error' &&
      videoRef.current &&
      streamRef.current &&
      videoRef.current.srcObject !== streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [authMode, faceStatus]);

  useEffect(() => {
    return () => {
      stopFaceCamera();
    };
  }, [stopFaceCamera]);

  const triggerVerification = useCallback(
    (sourceLabel?: string) => {
      if (verificationTriggeredRef.current) return;
      verificationTriggeredRef.current = true;
      stopFaceCamera();
      setIsVerifying(true);
      setTimeout(() => {
        hapticSuccess();
        setVerifiedSuccess(true);
        setTimeout(() => {
          setIsVerifying(false);
          onSuccess();
        }, 700);
      }, sourceLabel === 'face' ? 450 : 850);
    },
    [onSuccess, stopFaceCamera]
  );

  // Iniciar transmisión en vivo de cámara frontal + detección facial
  const startFaceVerification = useCallback(async () => {
    if (isCompleted || verifiedSuccess || isVerifying) return;
    stopFaceCamera();

    setAuthMode('face');
    setFaceStatus('starting');
    setFaceProgress(0);
    setFaceError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setFaceStatus('error');
      setFaceError(
        'Este navegador no permite abrir la cámara aquí. Puedes usar tu clave de 6 dígitos o tu huella.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setFaceStatus('scanning');

      // Detección facial nativa (Chrome/Edge/Android) + análisis de cuadro en <canvas> para compatibilidad universal
      const FaceDetectorCtor = (window as any).FaceDetector;
      const detector = FaceDetectorCtor
        ? new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 })
        : null;

      if (!analysisCanvasRef.current) {
        analysisCanvasRef.current = document.createElement('canvas');
        analysisCanvasRef.current.width = 120;
        analysisCanvasRef.current.height = 90;
      }

      let progressAcc = 0;
      let faceDetectedHapticSent = false;

      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;

        let isSubjectVisible = false;
        let hasEnoughLight = true;

        // 1. Análisis de luz y presencia en la zona central del óvalo
        const canvas = analysisCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Recorte central donde debe ubicarse el rostro dentro del óvalo
            const cropX = Math.floor(canvas.width * 0.25);
            const cropY = Math.floor(canvas.height * 0.15);
            const cropW = Math.floor(canvas.width * 0.5);
            const cropH = Math.floor(canvas.height * 0.7);
            const imgData = ctx.getImageData(cropX, cropY, cropW, cropH).data;

            let sumLum = 0;
            let sumSqLum = 0;
            const pixelCount = imgData.length / 4;

            for (let i = 0; i < imgData.length; i += 4) {
              const lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
              sumLum += lum;
              sumSqLum += lum * lum;
            }

            const meanLum = sumLum / Math.max(1, pixelCount);
            const variance = sumSqLum / Math.max(1, pixelCount) - meanLum * meanLum;

            // Si la lente está tapada o muy oscura, pedir iluminación
            if (meanLum < 16 || variance < 18) {
              hasEnoughLight = false;
            } else {
              isSubjectVisible = true;
            }
          }
        }

        // 2. Si el navegador soporta FaceDetector nativo, verificar rostro centrado
        if (detector && hasEnoughLight) {
          try {
            const faces = await detector.detect(video);
            if (faces && faces.length > 0) {
              isSubjectVisible = true;
            } else {
              // Si FaceDetector está activo y no detecta rostro en el cuadro, exigir encuadre
              isSubjectVisible = false;
            }
          } catch {
            // Si FaceDetector falla en este dispositivo, mantener análisis de cuadro
          }
        }

        if (!hasEnoughLight) {
          setFaceStatus('low_light');
          progressAcc = Math.max(0, progressAcc - 8);
          setFaceProgress(progressAcc);
          return;
        }

        if (isSubjectVisible) {
          if (!faceDetectedHapticSent) {
            faceDetectedHapticSent = true;
            hapticConfirm();
          }
          setFaceStatus('detected');
          progressAcc = Math.min(100, progressAcc + 14);
          setFaceProgress(progressAcc);

          if (progressAcc >= 100) {
            setFaceStatus('confirmed');
            if (scanTimerRef.current !== null) {
              window.clearInterval(scanTimerRef.current);
              scanTimerRef.current = null;
            }
            window.setTimeout(() => {
              triggerVerification('face');
            }, 350);
          }
        } else {
          setFaceStatus('scanning');
          progressAcc = Math.max(0, progressAcc - 5);
          setFaceProgress(progressAcc);
        }
      }, 180);
    } catch (err: any) {
      stopFaceCamera();
      setFaceStatus('error');
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setFaceError(
          'No diste permiso para usar la cámara. Actívala en tu navegador o usa tu clave de 6 dígitos.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setFaceError(
          'No encontramos una cámara frontal en este equipo. Puedes confirmar con tu clave o huella.'
        );
      } else {
        setFaceError(
          'No pudimos iniciar la cámara en este momento. Puedes reintentar o usar tu clave de seguridad.'
        );
      }
    }
  }, [isCompleted, isVerifying, stopFaceCamera, triggerVerification, verifiedSuccess]);

  // Permitir disparo desde comando de voz o ficha rápida inferior
  useEffect(() => {
    if (!externalBiometricAction || isCompleted || verifiedSuccess) return;
    if (externalBiometricAction.nonce === lastProcessedNonceRef.current) return;
    lastProcessedNonceRef.current = externalBiometricAction.nonce;

    if (externalBiometricAction.type === 'face') {
      startFaceVerification();
    } else if (externalBiometricAction.type === 'fingerprint') {
      hapticTap();
      triggerVerification('fingerprint');
    }
  }, [externalBiometricAction, isCompleted, startFaceVerification, triggerVerification, verifiedSuccess]);

  const handleKeyPress = (num: string) => {
    hapticKeypadPress();
    if (pin.length < 6) {
      const next = pin + num;
      setPin(next);
      if (next.length === 6) {
        triggerVerification('pin');
      }
    }
  };

  const handleDelete = () => {
    hapticKeypadPress();
    setPin((p) => p.slice(0, -1));
  };

  const handleClear = () => {
    hapticKeypadPress();
    setPin('');
  };

  const handleBackToPin = () => {
    hapticTap();
    stopFaceCamera();
    setAuthMode('pin');
    setFaceStatus('starting');
    setFaceProgress(0);
    setFaceError(null);
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 border-2 border-emerald-400/70 shadow-sm space-y-3 bg-gradient-to-b from-[#F2FBF8] to-white">
      {/* Cabecera amigable para adultos mayores */}
      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-100 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#13D698] text-white flex items-center justify-center shrink-0">
            {authMode === 'face' ? (
              <ScanFace className="w-4 h-4" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
          </div>
          <span className="text-xs font-black text-[#0D8F72] uppercase tracking-wider truncate">
            {authMode === 'face'
              ? 'Paso Final · Verificación con tu Cara'
              : 'Paso Final · Tu Clave de Seguridad'}
          </span>
        </div>
        {(isCompleted || verifiedSuccess) && (
          <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmado</span>
          </span>
        )}
      </div>

      {!verifiedSuccess ? (
        authMode === 'face' ? (
          /* ================= MODO CÁMARA FRONTAL EN VIVO CON GUÍA FACIAL ================= */
          <div className="space-y-3.5 animate-pop-in">
            <div className="text-center">
              <div className="text-[16px] font-black text-[#1E2538]">
                Mira hacia la cámara frontal
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                Ubica tu rostro dentro del óvalo central en un lugar iluminado.
              </p>
            </div>

            {faceStatus !== 'error' ? (
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-300 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Guía facial ovalada centrada */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`w-40 h-52 sm:w-44 sm:h-56 rounded-[999px] border-[3px] transition-all duration-300 ${
                      faceStatus === 'confirmed'
                        ? 'border-[#13D698] bg-emerald-500/15 shadow-[0_0_0_9999px_rgba(13,27,62,0.45)]'
                        : faceStatus === 'detected'
                        ? 'border-[#2EC4A4] shadow-[0_0_0_9999px_rgba(13,27,62,0.45)]'
                        : faceStatus === 'low_light'
                        ? 'border-amber-400 border-dashed shadow-[0_0_0_9999px_rgba(13,27,62,0.5)]'
                        : 'border-white/90 border-dashed shadow-[0_0_0_9999px_rgba(13,27,62,0.48)]'
                    }`}
                  />
                </div>

                {/* Scrim oscuro medido en la parte inferior para lectura WCAG AA sobre video */}
                <div className="absolute inset-x-0 bottom-0 pt-10 pb-3 px-3.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-white space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#2EC4A4] shrink-0" />
                      <span>
                        {faceStatus === 'starting' && 'Abriendo la cámara frontal…'}
                        {faceStatus === 'scanning' && 'Ubica tu cara en el centro del óvalo'}
                        {faceStatus === 'low_light' && 'Necesitamos un poco más de luz'}
                        {faceStatus === 'detected' && 'Rostro detectado, mantente quieto…'}
                        {faceStatus === 'confirmed' && '¡Rostro verificado con éxito!'}
                      </span>
                    </span>
                    <span className="tabular-nums text-[#2EC4A4]">{faceProgress}%</span>
                  </div>

                  {/* Barra de progreso facial */}
                  <div className="w-full h-2 rounded-full bg-white/25 overflow-hidden">
                    <div
                      className="h-full bg-[#13D698] transition-all duration-200 rounded-full"
                      style={{ width: `${faceProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="text-sm font-black text-slate-900">
                  No pudimos usar la cámara frontal
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  {faceError}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() => {
                      hapticTap();
                      startFaceVerification();
                    }}
                    className="flex-1 min-h-[46px] px-4 rounded-xl bg-[#29398E] hover:bg-[#1f2c73] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    type="button"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reintentar cámara</span>
                  </button>
                  <button
                    onClick={handleBackToPin}
                    className="flex-1 min-h-[46px] px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    type="button"
                  >
                    <KeyRound className="w-4 h-4 text-[#29398E]" />
                    <span>Usar clave de 6 dígitos</span>
                  </button>
                </div>
              </div>
            )}

            {/* Controles bajo la cámara */}
            {faceStatus !== 'error' && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handleBackToPin}
                  disabled={isVerifying || faceStatus === 'confirmed'}
                  className="min-h-[48px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  type="button"
                >
                  <KeyRound className="w-4 h-4 text-[#29398E] shrink-0" />
                  <span>Volver a mi clave</span>
                </button>
                <button
                  onClick={() => {
                    hapticWarning();
                    stopFaceCamera();
                    onCancel();
                  }}
                  disabled={isVerifying || faceStatus === 'confirmed'}
                  className="min-h-[48px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                  type="button"
                >
                  <span>Cancelar</span>
                </button>
              </div>
            )}

            {isVerifying && (
              <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-center gap-2 text-emerald-800 text-xs font-black animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span>Confirmando tu identidad con el banco…</span>
              </div>
            )}
          </div>
        ) : (
          /* ================= MODO TECLADO DE CLAVE DE SEGURIDAD + BOTONES ROSTRO Y HUELLA ================= */
          <>
            <div className="text-center">
              <div className="text-[16px] font-black text-[#1E2538]">
                Ingresa tu clave de seguridad de 6 dígitos
              </div>
              <p className="text-xs text-slate-600 font-semibold mt-0.5">
                También puedes confirmar con tu cara o tu huella digital abajo.
              </p>
            </div>

            {/* 6 Casilleros de clave */}
            <div className="flex justify-center gap-2 my-1">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-10 h-11 rounded-xl flex items-center justify-center text-xl font-black transition-all ${
                      isFilled
                        ? 'bg-emerald-50 border-2 border-[#13D698] text-emerald-800 scale-105 shadow-xs'
                        : 'bg-slate-100 border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isFilled ? '●' : '_'}
                  </div>
                );
              })}
            </div>

            {/* Teclado numérico táctil accesible */}
            <div className="max-w-[276px] mx-auto grid grid-cols-3 gap-1.5 pt-0.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleKeyPress(n)}
                  disabled={isVerifying || isCompleted}
                  className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-lg transition-transform active:scale-95 flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                  type="button"
                >
                  {n}
                </button>
              ))}

              <button
                onClick={handleClear}
                disabled={isVerifying || isCompleted || pin.length === 0}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-transform active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
                type="button"
              >
                Limpiar
              </button>

              <button
                onClick={() => handleKeyPress('0')}
                disabled={isVerifying || isCompleted}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-lg transition-transform active:scale-95 flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                type="button"
              >
                0
              </button>

              <button
                onClick={handleDelete}
                disabled={isVerifying || isCompleted || pin.length === 0}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base transition-transform active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
                aria-label="Borrar último dígito"
                type="button"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Botones grandes lado a lado bajo el teclado: Rostro y Huella */}
            {!isCompleted && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      hapticTap();
                      startFaceVerification();
                    }}
                    disabled={isVerifying}
                    className="min-h-[54px] px-3 py-2 rounded-xl bg-[#EEF2FF] hover:bg-[#E0E7FF] border-2 border-[#29398E]/25 text-[#29398E] font-extrabold text-xs sm:text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
                    type="button"
                  >
                    <ScanFace className="w-5 h-5 shrink-0" />
                    <span className="leading-tight text-left">Verificar con tu cara</span>
                  </button>

                  <button
                    onClick={() => {
                      hapticTap();
                      triggerVerification('fingerprint');
                    }}
                    disabled={isVerifying}
                    className="min-h-[54px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-500/30 text-[#0D8F72] font-extrabold text-xs sm:text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
                    type="button"
                  >
                    <Fingerprint className="w-5 h-5 shrink-0" />
                    <span className="leading-tight text-left">Usar huella digital</span>
                  </button>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      hapticWarning();
                      onCancel();
                    }}
                    disabled={isVerifying}
                    className="min-h-[40px] px-4 text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                    type="button"
                  >
                    Cancelar operación
                  </button>
                </div>
              </div>
            )}

            {isVerifying && (
              <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-center gap-2 text-emerald-800 text-xs font-black animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span>Verificando tu confirmación con el banco…</span>
              </div>
            )}
          </>
        )
      ) : (
        <div className="py-4 text-center space-y-2 animate-pop-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="text-[17px] font-black text-emerald-800">
            ¡Confirmación realizada con éxito!
          </div>
          <div className="text-xs font-semibold text-emerald-700">
            Generando tu comprobante oficial…
          </div>
        </div>
      )}
    </div>
  );
};
