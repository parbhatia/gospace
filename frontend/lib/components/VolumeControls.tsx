import { useState } from "react"

const VolumeMuteButton = ({ volume, handleChangeVolume }) => {
    return (

        <div className="flex">

            <input type="range" className="range range-sm" max="100" value={volume} step={1} onChange={handleChangeVolume} />
            <output>{volume}</output>
        </div>
    )
}

export default VolumeMuteButton
