import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";

type ClassValue = string | number | boolean | null | undefined;
function cn(...inputs: ClassValue[]): string { return inputs.filter(Boolean).join(" "); }

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => ( <TooltipPrimitive.Portal><TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("relative z-50 max-w-[280px] rounded-md bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-2 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className)} {...props}>{props.children}{showArrow && <TooltipPrimitive.Arrow className="-my-px fill-[var(--border-subtle)]" />}</TooltipPrimitive.Content></TooltipPrimitive.Portal>));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(({ className, align = "center", sideOffset = 4, ...props }, ref) => ( <PopoverPrimitive.Portal><PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} className={cn("z-50 w-64 rounded-xl bg-[var(--bg-surface-elevated)] p-2 text-[var(--text-primary)] shadow-md outline-none border border-[var(--border-subtle)] animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95", className)} {...props} /></PopoverPrimitive.Portal>));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => ( <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(({ className, children, ...props }, ref) => ( <DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className)} {...props}><div className="relative bg-[var(--bg-surface-elevated)] rounded-[28px] overflow-hidden shadow-2xl p-1">{children}<DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-[var(--bg-surface-elevated)]/50 p-1 hover:bg-[var(--color-primary)]/10 transition-all"><XIcon className="h-5 w-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" /><span className="sr-only">Close</span></DialogPrimitive.Close></div></DialogPrimitive.Content></DialogPortal>));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Icons
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}> <path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> </svg> );
const Settings2Icon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}> <path d="M20 7h-9" /> <path d="M14 17H5" /> <circle cx="17" cy="17" r="3" /> <circle cx="7" cy="7" r="3" /> </svg> );
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}> <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> </svg> ); // changed to arrow-up
const XIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}> <line x1="18" y1="6" x2="6" y2="18" /> <line x1="6" y1="6" x2="18" y2="18" /> </svg> );
const MicIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}> <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path> <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path> <line x1="12" y1="19" x2="12" y2="23"></line> </svg> );
const WrenchIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> );
const PaperclipIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> );

const toolsList = [
  { id: 'consulta_os_semana', name: 'Consulta OS', shortName: 'OS', icon: WrenchIcon },
  { id: 'consulta_cmv_loja', name: 'Consulta CMV', shortName: 'CMV', icon: WrenchIcon },
  { id: 'consulta_contas_pagar_exposicao', name: 'Contas a Pagar', shortName: 'Contas', icon: WrenchIcon },
];

export interface PromptBoxProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSubmitMessage?: (text: string, toolId: string | null) => void;
  isSending?: boolean;
}

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ className, onSubmitMessage, isSending, ...props }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = React.useState("");
    const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    
    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);
    
    React.useLayoutEffect(() => { 
      const textarea = internalTextareaRef.current; 
      if (textarea) { 
        textarea.style.height = "auto"; 
        const newHeight = Math.min(textarea.scrollHeight, 200); 
        textarea.style.height = `${newHeight}px`; 
      } 
    }, [value]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { 
      setValue(e.target.value); 
      if (props.onChange) props.onChange(e); 
    };

    const hasValue = value.trim().length > 0;
    const activeTool = selectedTool ? toolsList.find(t => t.id === selectedTool) : null;
    const ActiveToolIcon = activeTool?.icon;

    const handleSubmit = () => {
      if (hasValue && onSubmitMessage && !isSending) {
        onSubmitMessage(value.trim(), selectedTool);
        setValue("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <div className={cn("flex flex-col rounded-[32px] p-2 shadow-2xl transition-all bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] focus-within:border-[var(--text-secondary)]/50 focus-within:shadow-black/10 cursor-text mx-auto w-full", className)}>
        
        <textarea 
          ref={internalTextareaRef} 
          rows={1} 
          value={value} 
          onChange={handleInputChange} 
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..." 
          className="custom-scrollbar w-full resize-none border-0 bg-transparent px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-0 focus-visible:outline-none min-h-[56px] text-[15px]" 
          disabled={isSending}
          {...props} 
        />
        
        <div className="mt-1 px-2 pb-1 flex justify-between items-end">
          <div className="flex items-center gap-2">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium border border-[var(--border-subtle)] bg-transparent text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)] hover:scale-[1.02] active:scale-95 transition-all duration-200 focus-visible:outline-none">
                  <span className="flex items-center gap-1.5">
                    {activeTool ? (
                      <>
                        <ActiveToolIcon className="h-3.5 w-3.5" />
                        {activeTool.shortName}
                      </>
                    ) : (
                      <>
                        Select Source <span className="opacity-50 ml-1">▼</span>
                      </>
                    )}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-56 p-1 rounded-2xl bg-[var(--bg-surface-elevated)] shadow-xl animate-in zoom-in-95 duration-200">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Fontes de Dados (MCP)</div>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => { setSelectedTool(null); setIsPopoverOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-black/5 text-[var(--text-primary)] transition-colors">
                    <span className="w-4" /> {/* Spacer */}
                    Nenhuma fonte (Geral)
                  </button>
                  {toolsList.map(tool => ( 
                    <button key={tool.id} onClick={() => { setSelectedTool(tool.id); setIsPopoverOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] hover:bg-black/5 text-[var(--text-primary)] transition-colors"> 
                      <tool.icon className="h-4 w-4 text-[var(--text-secondary)]" /> 
                      {tool.name}
                    </button> 
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {activeTool && (
              <button onClick={() => setSelectedTool(null)} className="flex h-6 w-6 items-center justify-center rounded-full bg-black/5 text-[var(--text-secondary)] hover:bg-black/10 hover:text-[var(--text-primary)] hover:scale-110 active:scale-90 transition-all duration-200" title="Remover Fonte">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex h-9 items-center gap-1.5 px-3 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none">
                    <PaperclipIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Attach</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true} className="animate-in fade-in zoom-in-95"><p>Anexar arquivo (Mock)</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="flex h-9 items-center gap-1.5 px-3 rounded-full text-xs font-medium text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline-none">
                    <MicIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Voice</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true} className="animate-in fade-in zoom-in-95"><p>Comando de voz (Mock)</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button" 
                    onClick={handleSubmit}
                    disabled={!hasValue || isSending} 
                    className={cn(
                      "flex h-9 items-center gap-1.5 px-4 ml-1 rounded-full text-sm font-medium focus-visible:outline-none disabled:pointer-events-none hover:scale-[1.02] active:scale-95 transition-all duration-300",
                      hasValue 
                        ? "bg-[var(--text-primary)] text-[var(--bg-canvas)] hover:shadow-lg hover:shadow-black/20" 
                        : "bg-[var(--text-primary)] text-[var(--bg-canvas)] opacity-40"
                    )}
                  >
                    <span className="hidden sm:inline mr-1">Send</span>
                    <SendIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true} className="animate-in fade-in zoom-in-95"><p>Enviar mensagem</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  }
);
PromptBox.displayName = "PromptBox";
