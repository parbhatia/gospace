const Button = ({
   children,
   onClick,
   color = "bg-gray-100",
   selected
}: {
   children
   onClick
   color?: string
   selected?: boolean
}) => (
   <button
      onClick={onClick}
      type="button"
      className={`btn m-1 fill-current btn btn-sm lg:btn-md ${selected ? "btn-active" : ""}`}
   >
      {children}
   </button>
)

export default Button
