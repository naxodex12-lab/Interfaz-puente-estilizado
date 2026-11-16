import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Volume2, User, HelpCircle, ArrowDown, History } from 'lucide-react';
import { TimelineMessage, Contact, TransactionReceipt } from '../types';
import { hapticTap } from '../utils/haptics';
import { TransferTypeWidget, TransferDestinationType } from './widgets/TransferTypeWidget';
import { RecipientPickerWidget } from './widgets/RecipientPickerWidget';
import { NewAccountWidget } from './widgets/NewAccountWidget';
import { RecipientConfirmWidget } from './widgets/RecipientConfirmWidget';
import { AmountSelectorWidget } from './widgets/AmountSelectorWidget';
import { SafetySummaryWidget } from './widgets/SafetySummaryWidget';
import { BePassWidget, BiometricActionTrigger } from './widgets/BePassWidget';
import { ReceiptWidget } from './widgets/ReceiptWidget';

interface CopilotTimelineProps {
  messages: TimelineMessage[];
  contacts: Record<string, Contact>;
  balance: number;
  selectedContact: Contact | null;
  amount: number | null;
  receipt: TransactionReceipt | null;
  onReplayAudio: (text: string) => void;
  onSelectTransferType: (type: TransferDestinationType | any) => void;
  onSelectRecipient: (contact: Contact) => void;
  onConfirmNewAccount: (contact: Contact) => void;
  onCancelNewAccount: () => void;
  onConfirmRecipient: () => void;
  onRejectRecipient: () => void;
  onConfirmAmount: (amount: number) => void;
  onProceedToAuth: () => void;
  onModifyDetails: () => void;
  onAuthSuccess: () => void;
  onAuthCancel: () => void;
  onShareReceipt: () => void;
  onCopyReceipt: () => void;
  onNewTransfer: () => void;
  onGoHome: () => void;
  externalBiometricAction?: BiometricActionTrigger | null;
}

export const CopilotTimeline: React.FC<CopilotTimelineProps> = ({
  messages,
  contacts,
  balance,
  selectedContact,
  amount,
  receipt,
  onReplayAudio,
  onSelectTransferType,
  onSelectRecipient,
  onConfirmNewAccount,
  onCancelNewAccount,
  onConfirmRecipient,
  onRejectRecipient,
  onConfirmAmount,
  onProceedToAuth,
  onModifyDetails,
  onAuthSuccess,
  onAuthCancel,
  onShareReceipt,
  onCopyReceipt,
  onNewTransfer,
  onGoHome,
  externalBiometricAction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const latestWidgetRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const scrollToCurrentStep = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    const latestMsg = latestMessageRef.current;
    if (!container || !latestMsg) return;

    const viewH = container.clientHeight;
    const maxScroll = Math.max(0, container.scrollHeight - viewH);
    const containerRect = container.getBoundingClientRect();
    const getRelTop = (el: HTMLElement) =>
      el.getBoundingClientRect().top - containerRect.top + container.scrollTop;

    const msgTop = getRelTop(latestMsg);
    const msgHeight = latestMsg.getBoundingClientRect().height;
    const widget = latestWidgetRef.current;

    let targetTop: number;

    if (widget) {
      const widgetTop = getRelTop(widget);
      const widgetHeight = widget.getBoundingClientRect().height;

      // Si el mensaje + tarjeta caben juntos en pantalla, centrar el paso completo.
      // Si la tarjeta es alta (Paso 2, 3, 4 o Clave), centrar la tarjeta completa para que su cabecera nunca se corte arriba ni deje espacio vacío abajo.
      if (msgHeight <= viewH - 16) {
        targetTop = msgTop - (viewH - msgHeight) / 2;
      } else if (widgetHeight <= viewH - 16) {
        targetTop = widgetTop - (viewH - widgetHeight) / 2;
      } else {
        targetTop = widgetTop - 10;
      }
    } else {
      targetTop = msgTop - Math.max(12, (viewH - msgHeight) / 2);
    }

    const clamped = Math.max(0, Math.min(maxScroll, Math.round(targetTop)));
    container.scrollTo({ top: clamped, behavior });
  }, []);

  // Centrar suavemente el paso actual cuando llegan nuevos mensajes
  useEffect(() => {
    isUserScrolledUpRef.current = false;
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => scrollToCurrentStep('smooth'));
    }, 45);
    return () => window.clearTimeout(timer);
  }, [messages, scrollToCurrentStep]);

  // Mantener centrada la tarjeta activa si su altura cambia dinámicamente (ej. al abrir cámara facial o monto manual)
  useEffect(() => {
    const widgetEl = latestWidgetRef.current;
    if (!widgetEl || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (!isUserScrolledUpRef.current) {
        requestAnimationFrame(() => scrollToCurrentStep('smooth'));
      }
    });
    observer.observe(widgetEl);
    return () => observer.disconnect();
  }, [messages, scrollToCurrentStep]);

  // Detectar si el usuario scrolleó hacia arriba para mostrar el botón de regreso
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isUp = scrollHeight - (scrollTop + clientHeight) > 140;
    isUserScrolledUpRef.current = isUp;
    setShowScrollBottomBtn(isUp);
  }, []);

  const scrollToBottom = () => {
    isUserScrolledUpRef.current = false;
    scrollToCurrentStep('smooth');
  };

  return (
    <div className="flex-1 relative flex flex-col min-h-0 select-none">
      {/* Sombra sutil superior para indicar que hay historial hacia arriba */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#F4F6FA] to-transparent z-10 pointer-events-none opacity-80" />

      {/* Contenedor scrolleable con los mensajes */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 relative overflow-y-auto px-3 py-3 space-y-3 pb-4 scroll-smooth"
      >
        {/* Cabecera discreta de inicio de conversación */}
        {messages.length > 2 && (
          <div className="flex items-center justify-center gap-2 py-0.5 text-slate-400 text-xs font-bold opacity-60">
            <History className="w-3.5 h-3.5" />
            <span>Inicio de tu conversación de hoy</span>
          </div>
        )}

        {messages.map((m, idx) => {
          const isAssistant = m.sender === 'assistant';
          const isLatest = idx === messages.length - 1;
          const isSecondLatest = idx === messages.length - 2;

          // Gradación de opacidad (fade-out) para dar sentido de continuidad y foco en el paso actual
          const opacityStyle = isLatest
            ? 'opacity-100'
            : isSecondLatest
            ? 'opacity-85 hover:opacity-100'
            : 'opacity-55 hover:opacity-100 focus-within:opacity-100';

          return (
            <div
              key={m.id}
              ref={isLatest ? latestMessageRef : undefined}
              className={`space-y-2.5 transition-opacity duration-500 ease-out ${opacityStyle} group`}
            >
              {/* Burbuja de Mensaje */}
              <div
                className={`flex items-start gap-2 ${
                  isAssistant ? 'justify-start' : 'justify-end'
                }`}
              >
                {isAssistant && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs border mt-0.5 transition-colors ${
                      isLatest
                        ? 'bg-[#102048] text-[#2EC4A4] border-teal-500/40 ring-2 ring-teal-500/20'
                        : 'bg-slate-800 text-teal-400/80 border-slate-700'
                    }`}
                  >
                    <HelpCircle className="w-4.5 h-4.5 stroke-[2.4]" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs text-[14.5px] leading-snug animate-msg-in transition-all ${
                    isAssistant
                      ? isLatest
                        ? 'bg-[#102048] text-white border border-slate-700/80 rounded-tl-xs shadow-sm'
                        : 'bg-[#14234b]/95 text-slate-100 border border-slate-800 rounded-tl-xs'
                      : 'bg-[#29398E] text-white rounded-tr-xs'
                  }`}
                >
                  <div className="font-bold whitespace-pre-line font-['Nunito_Sans']">
                    {m.text}
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-white/10 text-[11px] text-slate-300">
                    <span className="opacity-80">{m.timestamp}</span>

                    {isAssistant && (
                      <button
                        onClick={() => {
                          hapticTap();
                          onReplayAudio(m.spokenText || m.text);
                        }}
                        className="inline-flex items-center gap-1 text-[#2EC4A4] hover:text-[#4ff2cc] hover:underline font-extrabold cursor-pointer"
                        title="Escuchar este mensaje en voz alta"
                        type="button"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Escuchar</span>
                      </button>
                    )}
                  </div>
                </div>

                {!isAssistant && (
                  <div className="w-8 h-8 rounded-full bg-[#F77F00] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 font-bold text-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Widget Interactivo centrado a ancho completo sin sangría lateral */}
              {m.widgetType && m.widgetType !== 'none' && (
                <div
                  ref={isLatest ? latestWidgetRef : undefined}
                  className={`w-full mx-auto transition-all duration-300 ${
                    m.isCompleted && !isLatest ? 'opacity-85 hover:opacity-100' : 'opacity-100'
                  }`}
                >
                  {m.widgetType === 'transfer_type' && (
                    <TransferTypeWidget
                      selectedType={m.widgetData?.selectedType || null}
                      onSelectType={onSelectTransferType}
                      isCompleted={m.isCompleted}
                    />
                  )}

                  {m.widgetType === 'recipient_picker' && (
                    <RecipientPickerWidget
                      contacts={contacts}
                      selectedContactId={selectedContact?.id || null}
                      onSelectContact={onSelectRecipient}
                      onSwitchToNewAccount={() => onSelectTransferType('new_account')}
                      isCompleted={m.isCompleted}
                    />
                  )}

                  {m.widgetType === 'new_account_form' && (
                    <NewAccountWidget
                      onConfirmNewAccount={onConfirmNewAccount}
                      onCancel={onCancelNewAccount}
                      isCompleted={m.isCompleted}
                    />
                  )}

                  {m.widgetType === 'recipient_confirm' && selectedContact && (
                    <RecipientConfirmWidget
                      contact={selectedContact}
                      onConfirm={onConfirmRecipient}
                      onReject={onRejectRecipient}
                      isConfirmed={m.isCompleted}
                    />
                  )}

                  {m.widgetType === 'amount_selector' && (
                    <AmountSelectorWidget
                      balance={balance}
                      selectedAmount={amount}
                      onConfirmAmount={onConfirmAmount}
                      isCompleted={m.isCompleted}
                    />
                  )}

                  {m.widgetType === 'pre_auth_summary' && selectedContact && amount && (
                    <SafetySummaryWidget
                      contact={selectedContact}
                      amount={amount}
                      balance={balance}
                      onProceedToAuth={onProceedToAuth}
                      onModify={onModifyDetails}
                      isCompleted={m.isCompleted}
                    />
                  )}

                  {m.widgetType === 'bepass_keypad' && (
                    <BePassWidget
                      onSuccess={onAuthSuccess}
                      onCancel={onAuthCancel}
                      isCompleted={m.isCompleted}
                      externalBiometricAction={!m.isCompleted ? externalBiometricAction : null}
                    />
                  )}

                  {m.widgetType === 'receipt_card' && receipt && (
                    <ReceiptWidget
                      receipt={receipt}
                      onShare={onShareReceipt}
                      onCopy={onCopyReceipt}
                      onNewTransfer={onNewTransfer}
                      onGoHome={onGoHome}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="h-2 shrink-0" />
      </div>

      {/* Botón flotante accesible "Paso actual ↓" cuando el usuario sube a leer mensajes anteriores */}
      {showScrollBottomBtn && (
        <button
          onClick={() => {
            hapticTap();
            scrollToBottom();
          }}
          className="absolute right-4 bottom-4 z-20 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#29398E] text-white font-black text-xs shadow-lg hover:bg-[#1f2c73] transition-all animate-pop-in active:scale-95 cursor-pointer border border-white/20"
          type="button"
          aria-label="Volver al paso actual"
        >
          <span>Paso actual</span>
          <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
