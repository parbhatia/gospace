import * as style from "@dicebear/avatars-initials-sprites"
import { createAvatar } from "@dicebear/avatars"
import { useEffect, useRef } from "react"

const useSvgAvatar = (seed: string | null) => {
    const iconSvgString = createAvatar(style, {
        seed: seed ? seed : new Date().toLocaleString(),
        // ... and other options
        width: 45,
        height: 45,
        bold: true,
        radius: 50
    })
    const svgRef = useRef() as React.MutableRefObject<HTMLInputElement>
    useEffect(() => {
        svgRef.current!.innerHTML = iconSvgString
    }, [seed])
    return {
        svgRef,
    }
}

export default useSvgAvatar