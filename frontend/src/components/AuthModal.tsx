import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AuthForm } from '@/components/AuthForm'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultTab?: 'signin' | 'signup'
}

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  defaultTab = 'signin',
}: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-surface border-border p-0 overflow-hidden gap-0">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Welcome</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in or create an account to continue.
          </p>
        </div>
        <div className="px-6 py-5">
          <AuthForm
            onSuccess={() => { onOpenChange(false); onSuccess?.() }}
            defaultTab={defaultTab}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
