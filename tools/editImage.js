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

    const sourceImageBuffers = await Promise.all(source.map(async (url) => {
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()
      return buffer
    }))

    const prodia = createProdia({
      token
    })
  
    const maxRetries = 3 // 设置最大重试次数
    let retryCount = 0
  
    while (retryCount < maxRetries) {
      try {
        const job = await prodia.job({
          'type': `interface.${model}.img2img.v1`,
          'config': {
            'prompt': prompt,
          }
        }, {
          input: sourceImageBuffers,
          accept: 'image/jpeg'
        })
  
        const image = await job.arrayBuffer()
        const buffer = Buffer.from(image)
        const result = await this.getImgUrlFromBuffer(url, buffer)
  
        return {
          url: result
        }
      } catch (error) {
        retryCount++
        console.error(`尝试第 ${retryCount} 次重试... 错误信息:`, error)
        //  可以添加延迟，避免过于频繁的重试
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // 延迟1秒, 2秒, 3秒
      }
    }
    // 如果重试达到最大次数仍然失败，抛出错误或者返回一个默认值
    console.error(`重试 ${maxRetries} 次后仍然失败，停止重试.`)
    throw new Error('绘图失败，请稍后重试')
    // 或者 return { url: '默认图片URL或错误提示' };
  }
}