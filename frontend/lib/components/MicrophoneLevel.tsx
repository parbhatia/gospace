const MicrophoneLevel = ({ audioRef }) => (
    <canvas
        className="w-full h-2 bg-transparent md:w-1/2 md:h-3 lg:h-4"
        ref={audioRef}
    ></canvas>
)

export default MicrophoneLevel