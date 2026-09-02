# Design: Correção de Import do Ícone Car em CentralImportWizard (352)

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/CentralImportWizard.tsx`
Linhas 15-19:
```diff
import { 
  UploadCloud, CheckCircle2, FileType2, Link as LinkIcon, ArrowRight, ArrowLeft, 
  Database, Search, X, AlertCircle, CreditCard, FileText, 
- Terminal, Sparkles, FileSpreadsheet, RefreshCcw, Loader2, Code2, Copy, Check, Lock, Unlock, Receipt
+ Terminal, Sparkles, FileSpreadsheet, RefreshCcw, Loader2, Code2, Copy, Check, Lock, Unlock, Receipt,
+ Car
} from 'lucide-react';
```

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Renderização de Telas de Importação no Navegador
- **Estado Inicial:** Usuário acessa a rota `/importacoes`.
- **Ação:** O componente `CentralImportWizard` monta os passos do wizard e os controles de pátio (Step 1.5 e Step 3).
- **Resultado Esperado:** O ícone `Car` é instanciado sem disparar `ReferenceError: Car is not defined`.
