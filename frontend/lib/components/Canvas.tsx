import CanvasDraw from "react-canvas-draw"
import { GithubPicker } from "react-color"
import { useState } from "react"

const DEFAULT_CANVAS_BRUSH_COLOR = "#191919"

const Canvas = ({ canvasRef, onChange }) => {
   const [color, setColor] = useState(DEFAULT_CANVAS_BRUSH_COLOR)
   const [brushRadius, setBrushRadius] = useState(3)
   const handleColorPick = (newColor) => {
      setColor(newColor.hex)
   }
   return (
      <div>
         <CanvasDraw
            ref={canvasRef}
            onChange={onChange}
            brushColor={color}
            disabled={false}
            saveData={null}
            hideInterface={false}
            brushRadius={brushRadius}
            catenaryColor="#0a0302"
            gridColor="rgba(150,150,150,0.17)"
            canvasWidth={1000}
            canvasHeight={1000}
            loadTimeOffset={5}
            lazyRadius={2}
            hideGrid={false}
            imgSrc=""
            immediateLoading={true}
         />
         <GithubPicker
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
      </div>
   )
}

export default Canvas
