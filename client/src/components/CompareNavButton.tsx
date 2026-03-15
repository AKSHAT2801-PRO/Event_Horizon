import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GitCompareArrows } from "lucide-react";

const CompareNavButton = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate("/compare")}
      className="flex items-center gap-3 px-8 py-5 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary transition-all duration-200 cursor-pointer group"
    >
      <GitCompareArrows size={24} className="text-primary" />
      <div className="text-left">
        <p className="font-bold text-lg tracking-tight text-primary">COMPARE EVENTS</p>
        <p className="data-label">SIDE-BY-SIDE ORBITAL ANALYSIS</p>
      </div>
    </motion.button>
  );
};

export default CompareNavButton;
