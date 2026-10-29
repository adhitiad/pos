import * as React from 'react'
import { cn } from 'cn'

import { Slot } from 'radix-ui'

const Divider = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, children, ...props }, ref) => {
  return (
    <Slot.Root
      ref={ref}
      data-slot="divider"
      className={cn(
        'flex items-center justify-center text-neutral-500 border-b border-border px-2 text-xs font-semibold',
        className,
      )}
      {...props}
    >
      <span className="border-t border-current -mx-2 mb-0.5" />
      {children && <span>{children}</span>}
    </Slot.Root>
  )
})
Divider.displayName = 'Divider'

export { Divider }
