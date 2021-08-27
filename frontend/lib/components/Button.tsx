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
      className={`flex items-center w-full justify-center h-12 px-4 py-2 m-0.5 text-lg uppercase font-semibold text-center transition fill-current duration-200 border-2 ${color}border-gray-900 rounded-lg shadow-md ease-i hover:bg-red-500 hover:text-white`}
   >
      {children}
   </button>
)

export default Button
