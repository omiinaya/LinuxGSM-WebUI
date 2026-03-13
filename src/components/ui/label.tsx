import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  HTMLLabelElement,
  React.ComponentPropsWithoutRef<"label"> & { required?: boolean }
>(({ className, required, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  >
    {props.children}
    {required && <span className="text-destructive ml-1">*</span>}
  </label>
));
Label.displayName = "Label";

export { Label };
