import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const PlaygroundButton = () => {
  return (
    <Link href="/playground">
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
        className="playground-btn group w-full "
      >
        <Image
          fill
          src={"/assets/images/earth-dark.jpeg"}
          alt="Earth from orbit"
          className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-background/50 group-hover:bg-background/20 transition-colors duration-500" />
        <div className="relative h-full flex flex-col items-center justify-center gap-3">
          <span className="data-label">3D SIMULATION</span>
          <span className="text-4xl sm:text-6xl font-black italic tracking-tighter">
            ENTER PLAYGROUND
          </span>
        </div>
      </motion.button>
    </Link>
  );
};

export default PlaygroundButton;
