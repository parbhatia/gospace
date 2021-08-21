const createMediaStream = async (
   mediaConstraints: MediaStreamConstraints,
): Promise<MediaStream> => {
   return navigator.mediaDevices.getUserMedia(mediaConstraints)
}

export default createMediaStream
