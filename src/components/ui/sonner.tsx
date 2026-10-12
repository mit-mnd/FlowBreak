import { Toaster as Sonner, type ToasterProps } from 'sonner'

export function Toaster({ theme, ...props }: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      // Bottom, above the 64px nav bar, so toasts never cover inputs at the top.
      position="bottom-center"
      offset={{ bottom: 80 }}
      mobileOffset={{ bottom: 80, left: 12, right: 12 }}
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-[var(--shadow-soft)] !font-sans',
          description: '!text-muted-foreground',
          actionButton: '!bg-water-strong !text-water-foreground !rounded-md !font-medium',
        },
      }}
      {...props}
    />
  )
}
