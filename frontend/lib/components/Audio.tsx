const Audio = ({
   mediaRef,
}: {
   mediaRef: React.MutableRefObject<HTMLAudioElement>
}) => {
   return (
      <audio
         className="w-full border-4 border-black shadow-lg"
         autoPlay
         controls
         playsInline
         ref={mediaRef}
      ></audio>
   )
}

export default Audio
