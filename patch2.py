import re

with open('src/components/importacoes/CentralImportWizard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { AgentRunnerModal } from './AgentRunnerModal';",
    "import { AgentRunnerModal } from './AgentRunnerModal';\nimport { ManualOsFallbackForm, ManualOsEntry } from './ManualOsFallbackForm';"
)

# 2. states
state_injection = """
  const [needsFallback, setNeedsFallback] = useState(false);
  const [manualOsData, setManualOsData] = useState<ManualOsEntry[]>([]);
  const [cloudOsData, setCloudOsData] = useState<any[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
"""
content = content.replace(
    "const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);",
    "const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);" + state_injection
)

# 3. handleCloudDataSuccess
handle_success_replacement = """
  const handleCloudDataSuccess = (cloudData: any[], fallback: boolean) => {
    setIsAgentModalOpen(false);
    setCloudOsData(cloudData);
    setNeedsFallback(fallback);
    
    if (fallback) {
      setStep(3.5 as any);
    } else {
      toast.success(`${cloudData.length} faturamentos encontrados e processados.`);
      
      const aliases = new Set<string>();
      results.osFiles.filter(r => r.success).forEach(r => aliases.add(r.storeAlias));
      results.maquininhaItems.forEach(i => aliases.add(i.storeName));
      results.ofxResults.forEach(o => aliases.add(o.alias));
      results.redeResults.filter(r => r.success).forEach(r => {
        r.transactions.forEach(t => aliases.add(t.storeName));
      });
      
      if (Array.from(aliases).length > 0) {
        setStep(2);
      } else {
        setStep(3);
      }
    }
  };
"""
content = re.sub(
    r"const handleCloudDataSuccess = .*?setStep\(3\);\s*\};",
    handle_success_replacement,
    content,
    flags=re.DOTALL
)

# 4. onDrop
ondrop_replacement = """
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    
    traceLog('1_UPLOAD', 'INFO', 'Iniciando processo de importação centralizada', newSessionId, {
      files_received: acceptedFiles.map(f => ({ filename: f.name, size_bytes: f.size }))
    });

    setPendingFiles(acceptedFiles);
    setIsAgentModalOpen(true);
  }, []);
"""
content = re.sub(
    r"const onDrop = useCallback\(async \(acceptedFiles: File\[\]\) => \{.*?\}, \[processFiles\]\);",
    ondrop_replacement,
    content,
    flags=re.DOTALL
)

# 5. Remove isProcessing useEffect logic that changes step
content = re.sub(
    r"useEffect\(\(\) => \{\s+if \(isProcessing\) return;.*?setStep\(3\);\s+\}\s+\}, \[isProcessing, results, stores\]\);",
    "",
    content,
    flags=re.DOTALL
)

with open('src/components/importacoes/CentralImportWizard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
