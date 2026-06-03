import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { FileUp, ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { ImportReportDialog } from "./ImportReportDialog";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

export function QuickActions() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-wrap justify-center gap-4 mb-12"
      >
        <motion.div variants={item}>
          <Button variant="primary" size="lg" className="gap-2 px-6" onClick={() => setIsImportOpen(true)}>
            <FileUp size={20} />
            Importar Relatório
          </Button>
        </motion.div>
        <motion.div variants={item}>
          <Button variant="secondary" size="lg" className="gap-2 px-6" onClick={() => navigate({ to: '/importacoes-despesas' })}>
            <ArrowUpRight size={20} />
            Importar Despesas
          </Button>
        </motion.div>
        <motion.div variants={item} className="hidden sm:block">
          <Button variant="circle" size="icon" onClick={() => queryClient.invalidateQueries()}>
            <RefreshCw size={20} />
          </Button>
        </motion.div>
      </motion.div>

      <ImportReportDialog 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
      />
    </>
  );
}
