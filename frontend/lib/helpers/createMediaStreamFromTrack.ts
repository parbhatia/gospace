const createMediaStreamFromTrack = async (
   track: MediaStreamTrack,
): Promise<MediaStream> => {
   const newStream = new MediaStream([track])
   return newStream
}

export default createMediaStreamFromTrack
