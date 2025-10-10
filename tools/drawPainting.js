import { MioFunction } from '../../../lib/function.js' 
import { createProdia } from 'prodia/v2'

export default class drawPainting extends MioFunction {
  constructor() {
    super({
      name: 'drawPainting',
      description: 'A tool that help you to draw a painting. You can adjust the style, quality and orientation of the painting.The default config is landscape,fast.finally,show user the picture in markdown format like ![image](url).',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt for the painting.',
          },
          orientation: {
            type:'string',
            description: 'The orientation of the painting: landscape(横), portrait(竖), square(方)',
            enum: ['landscape', 'portrait','square']
          },
          quality: {
            type:'string',
            description: 'The quality of the painting: fast(快速) or high(优质)',
            enum: ['fast', 'high']
          }  
        },
        required: ['prompt']
      }
    })
    this.func = this.drawPainting
  }

  async drawPainting(e) {
    const { token } = this.getPluginConfig()

    if (!token) {
      throw new Error('请先配置Prodia token')
    }

    const prompt = e.params.prompt
    const orientation = e.params.orientation || 'landscape'
    const quality = e.params.quality || 'fast'
    const url = e.user.origin
    // 设置图片尺寸
    let width = 1024
    let height = 768
    switch (orientation.toLowerCase()) {
      case 'portrait':
        width = 768
        height = 1024
        break
      case 'square':
        width = 1024
        height = 1024
        break
      // landscape为默认值，保持原有尺寸
    }
    const prodia = createProdia({
      token
    })
  
    try {
      const job = await prodia.job({
        'type': quality === 'high' ? 'inference.flux.pro.txt2img.v1' : 'inference.flux.dev.txt2img.v1',
        'config': {
          'prompt': prompt,
          'guidance_scale': 3,
          'steps': 25,
          'width': width,
          'height': height
        }
      }, {
        accept: 'image/jpeg'
      })
      // 验证 job 返回是否有效
      if (!job || typeof job.arrayBuffer !== 'function') {
        console.error('drawPainting: invalid job returned from prodia', { job })
        const err = new Error('绘图失败：Prodia 返回无效响应')
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
      // 结构化日志：记录关键请求上下文，避免打印 token
      console.error('drawPainting failed', {
        prompt: prompt?.slice?.(0, 120), // 截断以防太长
        orientation,
        quality,
        width,
        height,
        origin: url,
        message: error?.message
      }, error)
      // 抛出更明确的错误，保留原始错误信息作为 cause（若运行时支持）
      const err = new Error('绘图失败，请稍后重试: ' + (error && error.message ? error.message : '未知错误'))
      try { err.cause = error } catch (e) { /* ignore if not supported */ }
      throw err
    }
    // 或者 return { url: '默认图片URL或错误提示' };
  }
}