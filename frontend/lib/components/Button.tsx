const Button = ({ label, onClick }: { label: string; onClick: any }) => (
   <button
      className="px-3 py-2 uppercase transition duration-200 ease-in border-2 border-gray-900 rounded-full hover:bg-gray-800 hover:text-white focus:outline-none"
      onClick={onClick}
   >
      {label}
   </button>
)

export default Button
