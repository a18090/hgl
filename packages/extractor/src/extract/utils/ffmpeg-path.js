
const log = require('@home-gallery/logger')('extractor.ffmpeg');

const { getNativeCommand } = require('./native-command')

const getFfmpegPath = config => {
    return getNativeCommand('ffmpeg')
}

const getFprobePath = config => {
    return getNativeCommand('ffprobe')
}

module.exports = {
  getFfmpegPath,
  getFprobePath
}
