import { useState } from "react"

const VolumeMuteButton = ({ audioRef }) => {
    const [volume, setVolume] = useState(50)
    const handleChangeVolume = (e) => {
        const newVolume = e.target.value / 100
        audioRef.current.volume = newVolume
        setVolume(e.target.value)
    }
    return (
        <div>
            <output id="volume-output">{volume}</output>
            <div>
                <input type="range" id="volume-slider" max="100" value={volume} onChange={handleChangeVolume} />
            </div>
        </div>
    )
}

export default VolumeMuteButton
