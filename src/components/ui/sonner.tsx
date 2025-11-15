import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#1E293B] group-[.toaster]:border-[#0077B6]/20 group-[.toaster]:shadow-xl",
          description: "group-[.toast]:text-[#64748B]",
          actionButton:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-[#003366] group-[.toast]:to-[#0077B6] group-[.toast]:text-white group-[.toast]:hover:opacity-90",
          cancelButton:
            "group-[.toast]:bg-[#F9FAFB] group-[.toast]:text-[#64748B] group-[.toast]:hover:bg-[#E2E8F0]",
          success: "group-[.toast]:border-l-4 group-[.toast]:border-l-[#2E7D32]",
          error: "group-[.toast]:border-l-4 group-[.toast]:border-l-[#C62828]",
          warning: "group-[.toast]:border-l-4 group-[.toast]:border-l-[#F4B400]",
          info: "group-[.toast]:border-l-4 group-[.toast]:border-l-[#0077B6]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
