// An offer's media is a photo or an MP4 video. The bot tells them apart by
// the address (uploads are saved under .mp4), so the panel does the same.

export const VIDEO_LIMIT = 16 * 1024 * 1024; // WhatsApp's limit for a video
export const PHOTO_LIMIT = 8 * 1024 * 1024; // the bot's upload limit for a photo

/** Whether a media address is a video. */
export const isVideoUrl = (url) => /\.(mp4|3gp)$/i.test((url || '').trim().split(/[?#]/)[0]);

/** Whether a chosen file is a video. */
export const isVideoFile = (file) => !!file && file.type.startsWith('video/');

/** Why a chosen photo or video cannot be sent, or ''. */
export const mediaFileProblem = (file) => {
  if (!file) return 'Choose a photo or video to upload.';
  if (isVideoFile(file)) {
    if (file.type !== 'video/mp4') return 'WhatsApp plays MP4 videos only. Convert it to MP4 first.';
    if (file.size > VIDEO_LIMIT) return 'Use a video under 16 MB — WhatsApp refuses bigger ones.';
    return '';
  }
  if (!file.type.startsWith('image/')) return 'Choose a photo or an MP4 video.';
  if (file.size > PHOTO_LIMIT) return 'Use a photo under 8 MB.';
  return '';
};
