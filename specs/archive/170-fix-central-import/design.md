# Design Document: Central Import Wizard Mapping Fixes

## 1. Modificações em `useUnifiedStoreMapping`
**Arquivo:** `src/components/importacoes/CentralImportWizard.tsx` (linhas ~40-58)
**Lógica:**
Para inicializar corretamente o state a partir do `localStorage`, vamos precisar não só do localStorage string dictionary, mas também das `stores` originais, para casar os "names" com os `ids`, uma vez que o `mapping` final mapeia `Alias -> StoreId`.

**Código Design:**
```tsx
function useUnifiedStoreMapping(stores: any[]) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (stores.length === 0 || initialized) return;
    
    const savedStr = localStorage.getItem('@mecanica/unified-mappings');
    if (savedStr) {
      try {
        const savedSlugs = JSON.parse(savedStr);
        const initialMapping: Record<string, string> = {};
        
        // Match the slug with the actual store ID
        Object.keys(savedSlugs).forEach(alias => {
           const slugName = savedSlugs[alias];
           const foundStore = stores.find(s => 
              s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === slugName
           );
           if (foundStore) {
             initialMapping[alias] = foundStore.id;
           }
        });
        setMapping(initialMapping);
      } catch (e) {
        console.error("Failed to parse mappings", e);
      }
    }
    setInitialized(true);
  }, [stores, initialized]);

  // ... (manter o updateMapping original que salva o slug)
}
```

## 2. Roteamento de Wizard (`handleCloudDataSuccess`)
Em `CentralImportWizard.tsx` (linha ~95):
- Se `fallback: true`, não ir diretamente para `3.5`. O Mapeamento (Step 2) deve vir antes do Match Manual (3.5).
- Mudar para:
```tsx
      if (Array.from(aliases).length > 0) {
        setStep(2); // SEMPRE obrigar mapeamento primeiro
      } else {
        setStep(fallback ? 3.5 : 3);
      }
```
- Além disso, atualizar o botão "Avançar" do Step 2 para respeitar o `needsFallback`.
Em vez de pular do Step 2 (Mapeamento) para o Preview (3), no final de `subStep === 3` (maquininhas), o botão `Concluir Mapeamento` deve fazer:
```tsx
<Button onClick={() => setStep(needsFallback ? 3.5 : (manualOsData.length > 0 ? 2.5 : 3))}>
```

## 3. UI Safeguards (Prevenção Anti-Zero)
No topo do Step 3 (Preview), adicionar um `Alert` se `mapping` estiver sub-populado, impedindo submissão de valores zero acidental.
