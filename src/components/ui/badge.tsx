import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "border-black bg-white text-black hover:bg-black hover:text-white transition-colors",
        secondary: "bg-gray-100 border-transparent text-black hover:bg-gray-200 transition-colors",
        destructive: "border-red-500 bg-white text-red-500 hover:bg-red-500 hover:text-white transition-colors",
        outline: "border-black text-black",
    }

    return (
        <div
            className={cn(
                "inline-flex items-center rounded-none border px-2 py-0.5 text-[10px] font-mono uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2",
                variants[variant],
                className
            )}
            {...props}
        />
    )
}

export { Badge }
