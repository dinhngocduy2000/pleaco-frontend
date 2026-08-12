type InitialIconProps = {
  label: string
}

const InitialIcon = ({ label }: InitialIconProps) => (
  <span className="flex size-5 items-center justify-center rounded-md bg-[#bf360b] text-[10px] font-semibold text-primary-foreground">
    {label.charAt(0).toUpperCase()}
  </span>
)

export default InitialIcon
