export class Assistant {
  constructor({ log, form, input, onAsk, sound }) {
    this.log = log
    this.form = form
    this.input = input
    this.onAsk = onAsk
    this.sound = sound
    this.typingElement = null
    this.messageCount = 0
    this.form.addEventListener('submit', (event) => {
      event.preventDefault()
      const value = this.input.value.trim()
      if (!value) return
      this.input.value = ''
      this.ask(value)
    })
  }

  timestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  scroll() {
    this.log.scrollTo({ top: this.log.scrollHeight, behavior: 'smooth' })
  }

  push(text, options = {}) {
    const { who = 'ai', tone = '' } = options
    const message = document.createElement('div')
    message.className = `message ${who}${tone ? ` tone-${tone}` : ''}`
    if (who === 'ai') {
      const avatar = document.createElement('div')
      avatar.className = 'message-avatar'
      avatar.textContent = 'P'
      message.appendChild(avatar)
    }
    const body = document.createElement('div')
    body.className = 'message-body'
    const bubble = document.createElement('div')
    bubble.className = 'bubble'
    const paragraph = document.createElement('p')
    paragraph.textContent = text
    bubble.appendChild(paragraph)
    const time = document.createElement('span')
    time.className = 'message-time'
    time.textContent = this.timestamp()
    bubble.appendChild(time)
    body.appendChild(bubble)
    message.appendChild(body)
    this.log.appendChild(message)
    this.messageCount += 1
    requestAnimationFrame(() => message.classList.add('visible'))
    this.scroll()
    if (who === 'ai') this.sound?.speak()
    return message
  }

  player(text) {
    return this.push(text, { who: 'player' })
  }

  showTyping() {
    if (this.typingElement) return
    const message = document.createElement('div')
    message.className = 'message ai typing-message'
    const avatar = document.createElement('div')
    avatar.className = 'message-avatar'
    avatar.textContent = 'P'
    message.appendChild(avatar)
    const body = document.createElement('div')
    body.className = 'message-body'
    const bubble = document.createElement('div')
    bubble.className = 'bubble typing'
    bubble.innerHTML = '<span></span><span></span><span></span>'
    body.appendChild(bubble)
    message.appendChild(body)
    this.log.appendChild(message)
    this.typingElement = message
    this.scroll()
  }

  hideTyping() {
    if (!this.typingElement) return
    this.typingElement.remove()
    this.typingElement = null
  }

  ask(text) {
    this.sound?.click()
    this.player(text)
    this.showTyping()
    window.setTimeout(() => {
      this.hideTyping()
      this.onAsk(text)
    }, 720)
  }
}
