import { cn } from "@/lib/utils";

const gradients = [
  "from-pink-500 to-rose-500",
  "from-purple-500 to-indigo-500",
  "from-blue-500 to-cyan-500",
  "from-teal-500 to-emerald-500",
  "from-orange-500 to-amber-500",
];

export function AvatarGradient({ 
  name, 
  className,
  textClassName
}: { 
  name: string; 
  className?: string;
  textClassName?: string;
}) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  const colorIndex = name ? name.charCodeAt(0) % gradients.length : 0;
  const gradient = gradients[colorIndex];

  return (
    <div className={cn("flex items-center justify-center bg-gradient-to-br", gradient, className)}>
      <span className={cn("text-white font-bold", textClassName)}>{initial}</span>
    </div>
  );
}
