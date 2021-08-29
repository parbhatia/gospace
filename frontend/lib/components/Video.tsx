const Video = ({
   mediaRef,
   paused
}: {
   paused: boolean
   mediaRef: React.MutableRefObject<HTMLVideoElement>
}) => {
   return (
      <video
         className={`${paused ? "animate-pulse" : ""} border-4 border-black shadow-lg `}
         muted
         loop
         autoPlay
         // controls
         playsInline
         ref={mediaRef}
      ></video>
   )
}

export default Video
