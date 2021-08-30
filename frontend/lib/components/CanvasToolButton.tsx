const ToolButton = ({ children, onClick }) => (
   <button
      onClick={onClick}
      type="button"
      className="m-1 fill-current btn btn-outline btn-square btn-md btn-circle"
   >
      {children}
   </button>
)
export default ToolButton
