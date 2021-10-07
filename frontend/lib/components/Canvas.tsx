// import CanvasDraw from "react-canvas-draw"
import { useState } from "react"
import { GithubPicker } from "react-color"
import EraserIcon from "../../assets/eraser.svg"
import MinusIcon from "../../assets/minus.svg"
import PencilIcon from "../../assets/pencil.svg"
import PlusIcon from "../../assets/plus.svg"
import SaveIcon from "../../assets/save.svg"
import downloadImage from "../helpers/downloadImage"
import CanvasDraw from "./CanvasDraw"
import ToolButton from "./CanvasToolButton"

const DEFAULT_CANVAS_BRUSH_COLOR = "#191919"
const DEFAULT_CANVAS_GRID_COLOR = "#ffffff"
const DEFAULT_BRUSH_SIZE = 3
const DEFAULT_ERASER_SIZE = 35
const MAX_BRUSH_SIZE = 60
const MIN_BRUSH_SIZE = 1

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
      <div className="flex flex-col flex-wrap items-center justify-center h-full m-2 bg-white rounded-lg">
         <CanvasDraw
            // className="inline-block border-4 shadow-lg"
            ref={canvasRef}
            onChange={onChange}
            brushColor={color}
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
         <div className="flex flex-wrap items-center justify-center">
            <ToolButton onClick={handlePencilPick}>
               <PencilIcon />
            </ToolButton>
            <ToolButton onClick={handleEraserPick}>
               <EraserIcon />
            </ToolButton>
            <ToolButton onClick={handleCanvasSave}>
               <SaveIcon />
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
               <PlusIcon />
            </ToolButton>
            <ToolButton onClick={handleDecreaseRadius}>
               <MinusIcon />
            </ToolButton>
         </div>
      </div>
   )
}

export default Canvas
