import { createAvatar } from "@dicebear/avatars"
import * as style from "@dicebear/avatars-initials-sprites"
import { useEffect, useRef } from "react"

const useSvgAvatar = (seed: string | null) => {
   const iconSvgString = createAvatar(style, {
      seed: seed ? seed : new Date().toLocaleString(),
      // ... and other options
      width: 35,
      height: 35,
      bold: true,
   })
   const svgRef = useRef() as React.MutableRefObject<HTMLInputElement>
   useEffect(() => {
      svgRef.current!.innerHTML = iconSvgString
   }, [])
   return {
      svgRef,
   }
}

const AvatarComponent = ({ name }: { name: string | null }) => {
   const { svgRef } = useSvgAvatar(name)
   return (
      <div className={`w-full flex items-center pt-1`}>
         <div className="mr-2" ref={svgRef}></div>
         <div className="">
            <h2 className="text-xl font-bold text-gray-900 title-font">
               {name}
            </h2>
            {/* <h3 className="mb-3 text-gray-500">UI Developer</h3> */}
         </div>
      </div>
   )
}

export default AvatarComponent
