// import CanvasDraw from "react-canvas-draw"
import { useState } from "react"
import CanvasIcon from "../../assets/canvas.svg"
import Button from "../components/Button"

const CanvasManager = ({
   children,
   handleOpenRoomCanvas,
   handleCloseRoomCanvas,
}) => {
   const [displayCanvas, setDisplayCanvas] = useState(false)
   const handleOpenCanvas = async () => {
      await handleOpenRoomCanvas()
      setDisplayCanvas(true)
   }
   const handleCloseCanvas = async () => {
      await handleCloseRoomCanvas()
      setDisplayCanvas(false)
   }
   const OpenCanvasButton = (
      <Button onClick={handleOpenCanvas}>
         <CanvasIcon />
         <span className="ml-1">Open Canvas</span>
      </Button>
   )
   const CloseCanvasButton = (
      <Button onClick={handleCloseCanvas}>
         <CanvasIcon />
         <span className="ml-1">Close Canvas</span>
      </Button>
   )

   return (
      <>
         {OpenCanvasButton}
         <div
            className={`z-10 fixed inset-0 w-screen h-screen flex flex-col justify-center overflow-scroll bg-gray-900 bg-opacity-80 transition-opacity ${
               displayCanvas ? "" : "hidden"
            }`}
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
         >
            {displayCanvas && children}
            <div className="mt-2 bg-white">{CloseCanvasButton}</div>
         </div>
      </>
   )
}

export default CanvasManager
