import { AlertDialog as BaseAlertDialog } from "@base-ui-components/react/alert-dialog";
import { Checkbox as BaseCheckbox } from "@base-ui-components/react/checkbox";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { Field as BaseField } from "@base-ui-components/react/field";
import { Select as BaseSelect } from "@base-ui-components/react/select";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { twc } from "react-twc";
import type { TwcComponentProps } from "react-twc";

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
const cardStyles =
  "bg-white dark:bg-neutral-900 border border-mauve-200 dark:border-neutral-800 rounded-3xl p-6" as const;

export const Card = twc.div`${cardStyles}`;
export const CardSection = twc.section`${cardStyles}`;

/* ------------------------------------------------------------------ */
/* Section label                                                       */
/* ------------------------------------------------------------------ */
export const SectionLabel = twc.p`text-xs font-bold text-mauve-400 uppercase tracking-widest text-center m-0`;

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */
const badge = cva(
  "inline-flex items-center gap-1 text-xs font-bold py-1 px-3 rounded-full",
  {
    defaultVariants: {
      $variant: "outline",
    },
    variants: {
      $variant: {
        outline:
          "bg-mauve-50 dark:bg-neutral-800 text-mauve-600 dark:text-neutral-300 border border-mauve-200 dark:border-neutral-700",
        success:
          "bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400",
      },
    },
  }
);

type BadgeProps = TwcComponentProps<"span"> & VariantProps<typeof badge>;

export const Badge = twc.span<BadgeProps>(({ $variant }) =>
  badge({ $variant })
);

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */
const button = cva(
  "font-sans font-bold text-sm rounded-full border-none cursor-pointer py-3 px-6 transition-all duration-150 ease-out inline-flex items-center justify-center gap-2 leading-snug disabled:opacity-50 disabled:pointer-events-none",
  {
    defaultVariants: {
      $size: "default",
      $variant: "primary",
    },
    variants: {
      $size: {
        default: "py-3 px-6",
        small: "text-xs py-2 px-4",
        icon: "p-2 rounded-xl",
      },
      $variant: {
        primary: "bg-olive-800 text-white hover:bg-olive-900",
        outline:
          "bg-transparent border border-mauve-200 dark:border-neutral-700 text-mauve-900 dark:text-white hover:bg-mauve-50 dark:hover:bg-neutral-800 hover:border-mauve-400 dark:hover:border-neutral-600",
        ghost:
          "bg-transparent text-mauve-500 dark:text-neutral-400 py-2 px-3 hover:bg-mauve-100 dark:hover:bg-neutral-800 hover:text-mauve-900 dark:hover:text-white",
        "danger-ghost":
          "bg-transparent text-red-600 dark:text-red-400 py-2 px-3 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-800 dark:hover:text-red-300",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
    },
  }
);

type ButtonProps = TwcComponentProps<"button"> & VariantProps<typeof button>;

export const Button = twc.button<ButtonProps>(({ $variant, $size }) =>
  button({ $size, $variant })
);

/* ------------------------------------------------------------------ */
/* Dialog styles                                                       */
/* ------------------------------------------------------------------ */
const BACKDROP_CLASS =
  "fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-[999] transition-all duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0";

const POPUP_CLASS =
  "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white dark:bg-neutral-900 rounded-3xl w-[90%] max-w-md p-6 shadow-2xl focus:outline-none transition-all duration-150 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95";

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */
export function Checkbox({
  label,
  name,
  value,
  defaultChecked,
}: {
  label: string;
  name: string;
  value?: string | number;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
      <BaseCheckbox.Root
        name={name}
        value={value?.toString()}
        defaultChecked={defaultChecked}
        aria-label={label}
        className="flex items-center justify-center w-5 h-5 rounded-lg
                   border-2 border-mauve-300 dark:border-neutral-600 bg-white dark:bg-neutral-800
                   transition-all duration-150
                   data-[checked]:bg-olive-800 data-[checked]:border-olive-800
                   group-hover:border-mauve-400"
      >
        <BaseCheckbox.Indicator className="flex items-center justify-center text-white">
          <Check size={13} strokeWidth={3} />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
      <span className="text-sm font-medium text-mauve-700 dark:text-neutral-300 select-none">
        {label}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */
export function Dialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <BaseDialog.Trigger render={trigger} />}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={BACKDROP_CLASS} />
        <BaseDialog.Popup className={POPUP_CLASS}>
          <BaseDialog.Title className="text-xl font-display font-bold tracking-tight m-0 dark:text-white">
            {title}
          </BaseDialog.Title>
          {description && (
            <BaseDialog.Description className="mt-2 text-sm text-mauve-500 dark:text-neutral-400 leading-relaxed">
              {description}
            </BaseDialog.Description>
          )}
          <div className="mt-6">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export function DialogClose({
  children,
  className,
  $variant,
  $size,
}: {
  children: ReactNode;
  className?: string;
  $variant?: VariantProps<typeof button>["$variant"];
  $size?: VariantProps<typeof button>["$size"];
}) {
  return (
    <BaseDialog.Close className={className ?? button({ $size, $variant })}>
      {children}
    </BaseDialog.Close>
  );
}

/* ------------------------------------------------------------------ */
/* AlertDialog                                                         */
/* ------------------------------------------------------------------ */
export function AlertDialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <BaseAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <BaseAlertDialog.Trigger render={trigger} />}
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className={BACKDROP_CLASS} />
        <BaseAlertDialog.Popup className={POPUP_CLASS}>
          <BaseAlertDialog.Title className="text-xl font-display font-bold tracking-tight m-0 dark:text-white">
            {title}
          </BaseAlertDialog.Title>
          {description && (
            <BaseAlertDialog.Description className="mt-2 text-sm text-mauve-500 dark:text-neutral-400 leading-relaxed">
              {description}
            </BaseAlertDialog.Description>
          )}
          <div className="mt-6">{children}</div>
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}

export function AlertDialogClose({
  children,
  className,
  $variant,
  $size,
}: {
  children: ReactNode;
  className?: string;
  $variant?: VariantProps<typeof button>["$variant"];
  $size?: VariantProps<typeof button>["$size"];
}) {
  return (
    <BaseAlertDialog.Close className={className ?? button({ $size, $variant })}>
      {children}
    </BaseAlertDialog.Close>
  );
}

/* ------------------------------------------------------------------ */
/* Field                                                               */
/* ------------------------------------------------------------------ */
export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <BaseField.Root className="flex flex-col gap-1.5">
      <BaseField.Label className="text-sm font-semibold text-mauve-500 dark:text-neutral-400">
        {label}
      </BaseField.Label>
      <BaseField.Control render={children as ReactElement} />
      {error && (
        <BaseField.Error
          className="text-sm font-medium text-red-600 dark:text-red-400"
          forceShow
        >
          {error}
        </BaseField.Error>
      )}
    </BaseField.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */
export function SelectField({
  label,
  name,
  defaultValue,
  required,
  placeholder,
  options,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  children: ReactNode;
}) {
  const labelMap = options
    ? Object.fromEntries(options.map((o) => [o.value.toString(), o.label]))
    : null;

  return (
    <BaseField.Root className="flex flex-col gap-1.5">
      <BaseField.Label className="text-sm font-semibold text-mauve-500 dark:text-neutral-400">
        {label}
      </BaseField.Label>
      <BaseSelect.Root
        name={name}
        defaultValue={defaultValue?.toString()}
        required={required}
      >
        <BaseSelect.Trigger
          aria-label={label}
          className="flex items-center justify-between w-full
                     py-3 px-4
                     border border-mauve-200 dark:border-neutral-700 rounded-2xl bg-white dark:bg-neutral-900 text-mauve-950 dark:text-white
                     text-base font-medium transition-all duration-150 outline-none
                     focus:border-olive-700 focus:ring-3 focus:ring-olive-700/8
                     data-[placeholder]:text-mauve-400 data-[placeholder]:font-normal"
        >
          <BaseSelect.Value>
            {(value: string | null) => {
              if (!value) {
                return (
                  <span className="text-mauve-400 font-normal">
                    {placeholder ?? "Select…"}
                  </span>
                );
              }
              if (labelMap && labelMap[value]) {
                return labelMap[value];
              }
              return value;
            }}
          </BaseSelect.Value>
          <BaseSelect.Icon className="text-mauve-400">
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path
                d="M1 1.5L6 6.5L11 1.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="z-[1001]">
            <BaseSelect.Popup
              className="bg-white dark:bg-neutral-900 border border-mauve-200 dark:border-neutral-700 rounded-2xl shadow-xl
                         py-2 min-w-[var(--anchor-width)]
                         max-h-60 overflow-auto"
            >
              {children}
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </BaseField.Root>
  );
}

export function SelectItem({
  value,
  children,
}: {
  value: string | number;
  children: ReactNode;
}) {
  return (
    <BaseSelect.Item
      value={value.toString()}
      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium cursor-pointer
                 outline-none transition-colors
                 data-[highlighted]:bg-mauve-50 dark:data-[highlighted]:bg-neutral-800 text-mauve-900 dark:text-neutral-200"
    >
      <BaseSelect.ItemIndicator className="text-olive-700 dark:text-olive-400">
        <Check size={14} strokeWidth={2.5} />
      </BaseSelect.ItemIndicator>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}
