import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function QuickActions() {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-wrap justify-center gap-4 mb-12"
    >
      <motion.div variants={item}>
        <Button variant="primary" size="lg" className="gap-2 px-6">
          <ArrowDownLeft size={20} />
          Adicionar
        </Button>
      </motion.div>
      <motion.div variants={item}>
        <Button variant="secondary" size="lg" className="gap-2 px-6">
          <ArrowUpRight size={20} />
          Transferir
        </Button>
      </motion.div>
      <motion.div variants={item} className="hidden sm:block">
        <Button variant="circle" size="icon">
          <RefreshCw size={20} />
        </Button>
      </motion.div>
      <motion.div variants={item}>
        <Button variant="circle" size="icon">
          <Plus size={20} />
        </Button>
      </motion.div>
    </motion.div>
  );
}
