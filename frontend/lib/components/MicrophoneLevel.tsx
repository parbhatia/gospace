const MicrophoneLevel = ({ audioRef }) => (
    <canvas
        className="w-full h-3 bg-transparent "
        ref={audioRef}
    ></canvas>
)

export default MicrophoneLevel