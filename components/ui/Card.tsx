"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  animate?: boolean;
  onClick?: () => void;
}

export default function Card({
  children,
  className,
  hover = false,
  animate = false,
  onClick,
}: CardProps) {
  const baseClasses = cn(
    "card",
    hover && "hover:shadow-md transition-shadow duration-200 cursor-pointer",
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={baseClasses}
        onClick={onClick}
        whileHover={hover ? { y: -2 } : undefined}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {children}
    </div>
  );
}
