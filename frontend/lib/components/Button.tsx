const Button = ({
   children,
   onClick,
   color = "bg-gray-100",
}: {
   children
   onClick
   color?: string
}) => (
   <button
      onClick={onClick}
      type="button"
      className={`btn m-1 fill-current btn btn-xs md:btn-sm lg:btn-md`}
   >
      {children}
   </button>
)

export default Button
