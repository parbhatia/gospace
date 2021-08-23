export const SERVER_BASE_URL = "https://localhost:4000"

export const VIDEO_CONSTRAINTS = {
   video: {
      width: { min: 640, ideal: 1920, max: 1920 },
      height: { min: 400, ideal: 1080 },
      // aspectRatio: 1.777777778,
      // frameRate: { max: 30 },
      // facingMode: { exact: "user" },
   },
}
export const AUDIO_CONSTRAINTS = {
   video: false,
   audio: true,
}
