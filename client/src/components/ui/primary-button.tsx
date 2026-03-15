"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type PrimaryButtonProps = {
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function PrimaryButton({
  children = "View in Playground",
  onClick,
  className = "",
}: PrimaryButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-full border-2 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary transition-all duration-200 cursor-pointer group w-full py-4 px-4 justify-center ${className}`}
    >
      <div className="w-full text-center">
        <p className="font-bold text-lg tracking-tight text-primary">
          {children}
        </p>
      </div>
    </motion.button>
  );
}
