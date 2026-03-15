import { motion } from "framer-motion";
import Link from "next/link";

const CompareNavButton = () => {
  return (
    <Link href={"/compare"}>
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-full border-2 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary transition-all duration-200 cursor-pointer group w-full py-12 px-12"
      >
        <div className="text-left w-full">
          <p className="font-bold text-lg tracking-tight text-primary">
            COMPARE EVENTS
          </p>
        </div>
      </motion.button>
    </Link>
  );
};

export default CompareNavButton;
