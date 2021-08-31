import VolumeMuted from "../../assets/outlinedaudiomute.svg"
import VolumeOn from "../../assets/outlinedaudiounmute.svg"

const VolumeMuteButton = ({ volume, handleChangeVolume }) => {
    return (
        <div className="flex w-full p-1 md:w-1/2 ">
            <input type="range" className="p-2 range range-sm" max="100" value={volume} step={1} onChange={handleChangeVolume} />
            {volume === 0 ?
                <VolumeMuted /> : <VolumeOn />
            }
        </div>
    )
}

export default VolumeMuteButton
