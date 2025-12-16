import { MioFunction } from '../../../lib/function.js'
import { createProdia } from 'prodia/v2'
import sizeOf from 'image-size'

const editorModelsMap = {
  'nano-banana': 'inference.nano-banana.img2img.v2',
  'qwen-fast': 'inference.qwen.image-edit.plus.lightning.img2img.v2',
  'qwen-quality': 'inference.qwen.image-edit.plus.img2img.v2',
  'seedream-4': 'inference.seedream-4.img2img.v1',
  'gemini-3': 'inference.gemini-3-pro.img2img.v1',
  'flux': 'inference.flux-kontext.pro.txt2img.v2'
}

const aspectRatioOptions = ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '9:21']

export default class editImage extends MioFunction {
  constructor() {
    super({
      name: 'editImage',
      description: 'A tool that help you to edit or merge some Image. Finally,show user the picture in markdown format like ![image](url).',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt for the editing, default to be in English if the user does not specify a language.',
          },
          source: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'The source image urls for the editing.',
          },
          model: {
            type: 'string',
            description: 'The image model for the editing.',
            enum: Object.keys(editorModelsMap),
          },
          aspect_ratio: {
            type: 'string',
            default: '1:1',
            enum: [
              'default',
              ...aspectRatioOptions
            ],
            description: 'Only Avaliable With Model Gemini 3. Aspect ratio of output image.Default means use the same aspect ratio as source image,and this "default" option is recommended.'
          },
          resolution: {
            type: 'string',
            default: '1K',
            enum: ['1K', '2K', '4K'],
            description: 'Only Avaliable With Model Gemini 3. Resolution/image size of output. Use uppercase K.'
          }
        },
        required: ['prompt', 'source', 'model']
      }
    })
    this.func = this.editImage
  }

  async editImage(e) {
    const { token } = this.getPluginConfig()

    if (!token) {
      throw new Error('请先配置Prodia token')
    }

    const prompt = e.params.prompt
    const source = e.params.source
    const model = e.params.model || 'nano-banana'
    let aspectRatio = e.params.aspect_ratio || '1:1'
    const resolution = e.params.resolution || '2K'
    const url = e.user.origin

    const sourceImageBuffers = await Promise.all(source.map(async (url) => {
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      return buffer
    }))

    // 如果是 Gemini 3 且用户没有指定具体比例（'default' 或空），则根据第一张源图自适应比例
    if (model === 'gemini-3' && (!aspectRatio || aspectRatio === 'default')) {
      try {
        if (Array.isArray(sourceImageBuffers) && sourceImageBuffers.length > 0) {
          aspectRatio = this.getSelfAdaptResolution(sourceImageBuffers[0])
          console.info('editImage: auto selected aspect_ratio ->', aspectRatio)
        } else {
          aspectRatio = '1:1'
        }
      } catch (err) {
        console.error('editImage: failed to auto-detect aspect ratio', err)
        aspectRatio = '1:1'
      }
    }

    const prodia = createProdia({
      token
    })

    const jobConfig = {
      prompt,
      ...(model === 'gemini-3' && {
        aspect_ratio: aspectRatio,
        resolution
      })
    }


    try {
      const job = await prodia.job({
        'type': editorModelsMap[model],
        'config': jobConfig
      }, {
        inputs: sourceImageBuffers,
        accept: 'image/jpeg'
      })
      // 验证 job 返回是否有效
      if (!job || typeof job.arrayBuffer !== 'function') {
        console.error('editImage: invalid job returned from prodia', { job })
        const err = new Error('编辑失败：Prodia 返回无效响应')
        try { err.cause = job } catch (e) { /* ignore */ }
        throw err
      }

      const image = await job.arrayBuffer()
      const buffer = Buffer.from(image)
      const result = await this.getImgUrlFromBuffer(url, buffer)

      return {
        url: result
      }
    } catch (error) {
      console.error('editImage failed', {
        prompt: prompt?.slice?.(0, 120),
        model,
        sourceCount: Array.isArray(source) ? source.length : 0,
        origin: url,
        message: error?.message
      }, error)
      const err = new Error('编辑失败，请稍后重试: ' + (error && error.message ? error.message : '未知错误'))
      try { err.cause = error } catch (e) { /* ignore if not supported */ }
      throw err
    }
    // 或者 return { url: '默认图片URL或错误提示' };
  }

  /**
   * 根据图片 buffer 自动判断最接近的长宽比例
   * @param {ArrayBuffer|Uint8Array|Buffer} imageBuffer 
   * @returns {string} 最接近的长宽比例字符串，例如 '4:3'
   */
  getSelfAdaptResolution(imageBuffer) {
    // 解析图片的长宽比例，返回最接近的 aspect ratio（例如 '4:3'）
    try {
      // imageBuffer 可能是 ArrayBuffer、Uint8Array 或 Buffer
      const buf = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer)
      const { width, height } = sizeOf(buf)
      if (!width || !height) return '1:1'

      const imgRatio = width / height

      // 计算候选比例中与图片比例最接近的项
      let best = aspectRatioOptions[0]
      let bestDiff = Infinity

      for (const cand of aspectRatioOptions) {
        const parts = cand.split(':').map(Number)
        if (parts.length !== 2 || parts.some(Number.isNaN)) continue
        const candRatio = parts[0] / parts[1]
        // 相对差值，避免宽高数值差异带来的偏差
        const diff = Math.abs(imgRatio - candRatio) / Math.max(imgRatio, candRatio)
        if (diff < bestDiff) {
          bestDiff = diff
          best = cand
        }
      }

      return best
    } catch (err) {
      console.error('getSelfAdaptResolution failed', err)
      return '1:1'
    }
  }
}
