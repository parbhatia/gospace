import CanvasDraw from "react-canvas-draw"
import { GithubPicker } from "react-color"
import { useState } from "react"
import Image from "next/image"
import pencilIcon from "../../assets/pencil.svg"
import eraserIcon from "../../assets/eraser.svg"
import saveIcon from "../../assets/save.svg"
import plusIcon from "../../assets/plus.svg"
import minusIcon from "../../assets/minus.svg"
import downloadImage from "../helpers/downloadImage"
import ToolButton from "./CanvasToolButton"

const DEFAULT_CANVAS_BRUSH_COLOR = "#191919"
const DEFAULT_CANVAS_GRID_COLOR = "#ffffff"
const DEFAULT_BRUSH_SIZE = 3
const DEFAULT_ERASER_SIZE = 15
const MAX_BRUSH_SIZE = 20
const MIN_BRUSH_SIZE = 20

const Canvas = ({ canvasRef, onChange }) => {
   const [prevColor, setPrevColor] = useState(DEFAULT_CANVAS_BRUSH_COLOR)
   const [color, setColor] = useState(DEFAULT_CANVAS_BRUSH_COLOR)
   const [toolMode, setToolMode] = useState<"brush" | "eraser">("brush")
   const [brushRadius, setBrushRadius] = useState(DEFAULT_BRUSH_SIZE)
   const [eraserRadius, setEraserRadius] = useState(DEFAULT_ERASER_SIZE)
   const handleColorPick = (newColor) => {
      setToolMode("brush")
      setColor(newColor.hex)
   }
   const handlePencilPick = () => {
      setToolMode("brush")
      setColor(prevColor) //restore brush color
      setPrevColor(color)
   }
   const handleEraserPick = () => {
      setToolMode("eraser")
      setPrevColor(color) //save brush color
      setColor(DEFAULT_CANVAS_GRID_COLOR)
   }

   const handleCanvasSave = () => {
      let baseCanvas = canvasRef.current.canvasContainer.children[3] // canvas with background image
      let baseCanvasContex = baseCanvas.getContext("2d")
      baseCanvasContex.drawImage(
         canvasRef.current.canvasContainer.children[1],
         0,
         0,
      )
      downloadImage(baseCanvas.toDataURL(), "canvas.jpeg")
   }
   const setRadiusFunction =
      toolMode === "brush" ? setBrushRadius : setEraserRadius

   const handleIncreaseRadius = () => {
      setRadiusFunction((prevRadius) => {
         if (prevRadius === MAX_BRUSH_SIZE) {
            return MAX_BRUSH_SIZE
         }
         return prevRadius + 1
      })
   }
   const handleDecreaseRadius = () => {
      setRadiusFunction((prevRadius) => {
         if (prevRadius === MIN_BRUSH_SIZE) {
            return MIN_BRUSH_SIZE
         }
         return prevRadius - 1
      })
   }

   return (
      <div className="flex flex-col items-center ">
         <div className="border-4 border-black shadow-lg">
            <CanvasDraw
               ref={canvasRef}
               onChange={onChange}
               brushColor={color}
               disabled={false}
               saveData={null}
               hideInterface={false}
               brushRadius={toolMode === "brush" ? brushRadius : eraserRadius}
               // catenaryColor="#0a0302"
               gridColor={DEFAULT_CANVAS_GRID_COLOR}
               canvasWidth={1000}
               canvasHeight={1000}
               loadTimeOffset={5}
               lazyRadius={2}
               hideGrid={false}
               imgSrc=""
               immediateLoading={true}
            />
         </div>
         <div className="flex">
            <ToolButton onClick={handlePencilPick}>
               <Image src={pencilIcon} alt="pencilIcon" />
            </ToolButton>
            <ToolButton onClick={handleEraserPick}>
               <Image src={eraserIcon} alt="eraserIcon" />
            </ToolButton>
            <ToolButton onClick={handleCanvasSave}>
               <Image src={saveIcon} alt="saveIcon" />
            </ToolButton>

            <GithubPicker
               className="m-0.5"
               width={265}
               colors={[
                  "#B80000",
                  "#DB3E00",
                  "#FCCB00",
                  "#008B02",
                  "#006B76",
                  "#1273DE",
                  "#004DCF",
                  "#5300EB",
                  "#A3A3A3",
                  "#565656",
                  "#EB9694",
                  "#FAD0C3",
                  "#FEF3BD",
                  "#C1E1C5",
                  "#BEDADC",
                  "#C4DEF6",
                  "#BED3F3",
                  "#D4C4FB",
                  "#E5E5E5",
                  DEFAULT_CANVAS_BRUSH_COLOR,
               ]}
               onChangeComplete={handleColorPick}
            />
            <ToolButton onClick={handleIncreaseRadius}>
               <Image src={plusIcon} alt="saveIcon" />
            </ToolButton>
            <ToolButton onClick={handleDecreaseRadius}>
               <Image src={minusIcon} alt="saveIcon" />
            </ToolButton>
         </div>
      </div>
   )
}

export default Canvas
