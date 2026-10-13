import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field" className={cn("field", className)} {...props} />; }
export function FieldContent({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field-content" className={cn("grid gap-1", className)} {...props} />; }
export function FieldDescription({ className, ...props }: React.ComponentProps<"p">) { return <p data-slot="field-description" className={cn("text-muted-foreground text-xs", className)} {...props} />; }
export function FieldError({ className, ...props }: React.ComponentProps<"p">) { return <p data-slot="field-error" role="alert" className={cn("text-destructive text-xs", className)} {...props} />; }
export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field-group" className={cn("grid gap-4", className)} {...props} />; }
export function FieldLabel({ className, ...props }: React.ComponentProps<"label">) { return <label data-slot="field-label" className={cn("font-semibold", className)} {...props} />; }
export function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) { return <legend data-slot="field-legend" className={cn("font-semibold", className)} {...props} />; }
export function FieldSeparator({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field-separator" role="separator" className={cn("border-t", className)} {...props} />; }
export function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) { return <fieldset data-slot="field-set" className={cn("grid gap-4", className)} {...props} />; }
export function FieldTitle({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="field-title" className={cn("font-semibold", className)} {...props} />; }
