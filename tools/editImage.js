import { MioFunction } from '../../../lib/function.js' 
import { createProdia } from 'prodia/v2'

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
            enum: ['nano-banana', 'qwen.image-edit.lightning', 'seedream-4' , 'flux-kontext.pro']
          },
        },
        required: ['prompt','source']
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
    const url = e.user.origin

    const sourceImageBuffers = await Promise.all(source.map(async (url) => {
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      return buffer
    }))

    const prodia = createProdia({
      token
    })
  
    try {
      const job = await prodia.job({
        'type': `inference.${model}.img2img.v1`,
        'config': {
          'prompt': prompt,
        }
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
}