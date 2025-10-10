import { MioFunction } from '../../../lib/function.js'
import { createProdia } from 'prodia/v2'

export default class drawSeedream4 extends MioFunction {
  constructor() {
    super({
      name: 'drawSeedream4',
      description: 'Use seedream-4 to generate images from text prompts. Provide a ratio and prompt; the tool maps ratio to recommended resolution (max dimension 2048). Returns { url } to the generated image.Response user with the picture in markdown format like ![image](url).',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The text prompt for generation.'
          },
          ratio: {
            type: 'string',
            description: 'Desired aspect ratio. Tool maps ratio to resolution.',
            enum: ['1:1', '3:4', '16:9', '4:3', '9:16']
          }
        },
        required: ['prompt']
      }
    })
    this.func = this.drawSeedream4
  }

  // 推荐映射：比例 -> {width, height}，最大像素为 2048
  static ratioToResolution(ratio) {
    switch (ratio) {
      case '4:3':
        // 横向优先，4:3 -> 2048 x round(2048 * 3/4) = 2048 x 1536
        return { width: 2048, height: 1536 }
      case '16:9':
        return { width: 2048, height: 1152 }
      case '3:4':
        // 纵向优先，3:4 -> 使用 2048 高 -> width = round(2048 * 3/4) = 1536
        return { width: 1536, height: 2048 }
      case '9:16':
        return { width: 1152, height: 2048 }
      case '1:1':
      default:
        return { width: 2048, height: 2048 }
    }
  }

  async drawSeedream4(e) {
    const { token } = this.getPluginConfig()
    if (!token) {
      throw new Error('请先配置Prodia token')
    }

    const prompt = e.params.prompt
    const ratio = e.params.ratio || '3:4'
    const url = e.user.origin

    const { width, height } = drawSeedream4.ratioToResolution(ratio)

    const prodia = createProdia({ token })

    try {
      const job = await prodia.job({
        type: 'inference.seedream-4.txt2img.v1',
        config: {
          prompt,
          width,
          height
        }
      }, {
        accept: 'image/jpeg'
      })

      if (!job || typeof job.arrayBuffer !== 'function') {
        console.error('drawSeedream4: invalid job returned from prodia', { job })
        const err = new Error('生成失败：Prodia 返回无效响应')
        try { err.cause = job } catch (e) { /* ignore */ }
        throw err
      }

      const image = await job.arrayBuffer()
      const buffer = Buffer.from(image)
      const result = await this.getImgUrlFromBuffer(url, buffer)

      return { url: result }
    } catch (error) {
      console.error('drawSeedream4 failed', {
        prompt,
        ratio,
        width,
        height,
        origin: url,
        message: error?.message
      }, error)

      const err = new Error('生成失败，请稍后重试: ' + (error && error.message ? error.message : '未知错误'))
      try { err.cause = error } catch (e) { /* ignore */ }
      throw err
    }
  }
}
