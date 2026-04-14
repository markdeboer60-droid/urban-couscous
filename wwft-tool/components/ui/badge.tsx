import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-600 text-white",
        secondary: "border-transparent bg-gray-200 text-gray-800",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "text-gray-700 border-gray-300",
        success: "border-transparent bg-green-600 text-white",
        warning: "border-transparent bg-orange-500 text-white",
        laag: "border-transparent bg-green-100 text-green-800 border-green-200",
        midden: "border-transparent bg-yellow-100 text-yellow-800 border-yellow-200",
        hoog: "border-transparent bg-red-100 text-red-800 border-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
