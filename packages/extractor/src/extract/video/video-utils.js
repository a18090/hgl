const getVideoStream = (entry) => {
  const streams = entry.meta?.ffprobe?.streams
  return streams?.find(stream => stream.codec_type == 'video')
}

const isPortraitVideo = (video) => {
  const displayMatrix = video?.side_data_list?.find(sideData => sideData.side_data_type == 'Display Matrix')
  return [-90, 90].includes(displayMatrix?.rotation)
}

const fixRotatedScale = (isPortrait) => {
  if (!isPortrait) {
    return v => v
  }

  const swapDimensions = s => s
    .replace(/(ih|iw)/g, (_, m) => m == 'ih' ? 'iw' : 'ih')
    .replace(/(in_h|in_w)/g, (_, m) => m == 'in_h' ? 'in_w' : 'in_h')

  return v => {
    if (!v.match(/scale=/)) {
      return v
    } else if (v.match(/ /)) {
      return v.split(' ').map(fixRotatedScale(isPortrait)).join(' ')
    }
    // example format -2:'min(720,ih)'
    const match = v.match(/scale=([^:]+):(\'[^']+\'|[^,]+)/)
    if (!match) {
      return v
    }

    return v.substring(0, match.index) +
      `scale=${swapDimensions(match[2])}:${swapDimensions(match[1])}` +
      v.substring(match.index + match[0].length)
  }
}

const defaultFfmpegOptions = {
  videoEncoder: 'libx265',
  frameRate: 24,
  maxVideoBitRate: 2000,
  preset: 'veryfast',
  level: '3.0',
  ext: 'mp4'
}

function getFfmpegArgs(entry, options) {
  const isPortrait = isPortraitVideo(getVideoStream(entry))

  const scale = options.scale ? options.scale : `-2:\'min(${options.previewSize || 720},ih)\'`
  const ffmpegOptions = {...defaultFfmpegOptions, ...options, scale}

  const defaultFfmpegArgs = [
    `-c:v ${ffmpegOptions.videoEncoder}`,
    '-x265-params asm=avx512',
    '-c:a aac',
    `-r ${ffmpegOptions.frameRate}`,
    `-vf scale=${ffmpegOptions.scale}`,
    `-preset ${ffmpegOptions.preset}`,
    `-level:v ${typeof ffmpegOptions.level == 'number' ? ffmpegOptions.level.toFixed(1) : ffmpegOptions.level}`,
    `-maxrate ${ffmpegOptions.maxVideoBitRate}k`,
    `-bufsize ${2 * ffmpegOptions.maxVideoBitRate}k`,
    '-b:a 128k'
  ]

  const ffmpegArgs = [
    ...(Array.isArray(options.customFfmpegArgs) ? options.customFfmpegArgs : defaultFfmpegArgs),
    ...(options.addFfmpegArgs ? options.addFfmpegArgs : []),
    `-f ${ffmpegOptions.ext}`,
  ]

  return ffmpegArgs.map(fixRotatedScale(isPortrait))
}

const getVideoOptions = (extractor, config) => {
  const { ffprobePath, ffmpegPath } = extractor
  const options = {
    previewSize: 720,
    ext: 'mp4',
    ...config?.extractor?.video
  }

  const videoSuffix = `video-preview-${options.previewSize}.${options.ext}`;
  return {...options, videoSuffix, ffprobePath, ffmpegPath }
}

module.exports = {
  getVideoStream,
  isPortraitVideo,
  fixRotatedScale,
  getFfmpegArgs,
  getVideoOptions
}
