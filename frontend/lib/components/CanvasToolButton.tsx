const ToolButton = ({ children, onClick }) => (
   <button
      onClick={onClick}
      type="button"
      className="flex items-center justify-center h-12 px-4 py-2 m-0.5 text-base font-semibold text-center text-white transition duration-200 border-2 border-gray-900 rounded-lg shadow-md ease-i hover:bg-gray-200 focus:ring-blue-500 focus:ring-offset-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
   >
      {children}
   </button>
)
export default ToolButton
