"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInput>, 'type'> {
  onToggle?: (checked: boolean) => void
}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, onToggle, checked: controlledChecked, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(controlledChecked === true)

    React.useEffect(() => {
      if (controlledChecked !== undefined) {
        setIsChecked(controlledChecked === true)
      }
    }, [controlledChecked])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newChecked = e.target.checked
      setIsChecked(newChecked)
      if (onToggle) {
        onToggle(newChecked)
      }
      if (props.onChange) {
        props.onChange(e)
      }
    }

    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-[#8B2E00]/50 rounded-full peer transition-colors",
            isChecked && "bg-[#8B2E00]"
          )}
        >
          <div
            className={cn(
              "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
              isChecked && "translate-x-5"
            )}
          />
        </div>
      </label>
    )
  }
)

Toggle.displayName = "Toggle"

export { Toggle }
