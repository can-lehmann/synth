// Copyright (c) 2026 Can Joshua Lehmann

// Utilities

String.prototype.addElementsTo = function(element) {
  element.appendChild(document.createTextNode(this))
}

Array.prototype.addElementsTo = function(element) {
  for (const item of this) {
    item.addElementsTo(element)
  }
}

Element.prototype.addElementsTo = function(element) {
  element.appendChild(this)
}

function h(tag, ...args) {
  const classes = []
  if (tag.indexOf(".") !== -1) {
    const parts = tag.split(".")
    tag = parts[0]
    classes.push(...parts.slice(1))
  }

  if (tag.length === 0) {
    tag = "div"
  }

  const element = document.createElement(tag)

  if (args.length > 0 && typeof args[0] === "object" && !Array.isArray(args[0])) {
    const attributes = args.shift()
    for (const [key, value] of Object.entries(attributes)) {
      if (key === "class") {
        classes.push(...value.split(" "))
      } else if (key.startsWith("on")) {
        element[key] = value
      } else if (tag == "option" && key == "selected") {
        if (value) {
          element.setAttribute(key, "")
        }
      } else if (key == "style") {
        Object.assign(element.style, value)
      } else {
        element.setAttribute(key, value)
      }
    }
  }

  for (const className of classes) {
    element.classList.add(className)
  }

  args.addElementsTo(element)
  return element
}

// ADSR

class Adsr {
  constructor(attack = 0.1, decay = 0.2, sustain = 0.9, release = 0.2) {
    this.attack = attack
    this.decay = decay
    this.sustain = sustain
    this.release = release
  }

  getLevel(time, releaseTime) {
    if (time < this.attack) {
      return time / this.attack
    } else if (time < this.attack + this.decay) {
      return (1 - (time - this.attack) / this.decay * (1 - this.sustain))
    } else if (releaseTime === null || time < releaseTime) {
      return this.sustain
    } else if (time < releaseTime + this.release) {
      return this.sustain * (1 - (time - releaseTime) / this.release)
    } else {
      return 0
    }
  }
}

class AdsrEditor {
  constructor(adsr) {
    this.adsr = adsr
    this.element = h(".adsr-editor.card", {style: {width: "300px"}}, [
      h("h1", "ADSR Envelope Editor"),
      this.canvas = h("canvas.adsr-canvas"),
      h(".row", [
        h("label", "Attack"),
        h("input", {
          type: "range",
          min: 0,
          max: 5,
          step: 0.01,
          value: this.adsr.attack,
          oninput: (e) => {
            this.adsr.attack = parseFloat(e.target.value)
            console.log(e)
            this.draw()
          }
        }),
      ]),
      h(".row", [
        h("label", "Decay"),
        h("input", {
          type: "range",
          min: 0,
          max: 5,
          step: 0.01,
          value: this.adsr.decay,
          oninput: (e) => {
            this.adsr.decay = parseFloat(e.target.value)
            this.draw()
          }
        }),
      ]),
      h(".row", [
        h("label", "Sustain"),
        h("input", {
          type: "range",
          min: 0,
          max: 1,
          step: 0.01,
          value: this.adsr.sustain,
          oninput: (e) => {
            this.adsr.sustain = parseFloat(e.target.value)
            this.draw()
          }
        }),
      ]),
      h(".row", [
        h("label", "Release"),
        h("input", {
          type: "range",
          min: 0,
          max: 5,
          step: 0.01,
          value: this.adsr.release,
          oninput: (e) => {
            this.adsr.release = parseFloat(e.target.value)
            this.draw()
          }
        }),
      ]),
    ])

    this.ctx = this.canvas.getContext("2d")
    this.draw()

    new ResizeObserver(() => this.resize()).observe(this.canvas)
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.draw()
  }

  draw() {
    const width = this.canvas.width
    const height = this.canvas.height
    this.ctx.clearRect(0, 0, width, height)

    this.ctx.strokeStyle = "#fff"
    this.ctx.lineWidth = 2

    const padding = 12

    this.ctx.beginPath()
    this.ctx.moveTo(padding, height - padding)
    for (let x = padding; x < width - padding; x++) {
      const time = (x - padding) / (width - 2 * padding) * 2
      const level = this.adsr.getLevel(time, this.adsr.attack + this.adsr.decay + 0.2)
      const y = (1 - level) * (height - 2 * padding) + padding
      this.ctx.lineTo(x, y)
    }
    this.ctx.stroke()
  }
}

// Additive Synth

class AdditiveSynth {
  constructor() {
    this.oscillators = []
    this.scale = 1
  }

  addOscillator(kind, factor, phase, amplitude) {
    this.oscillators.push({ kind, factor, phase, amplitude })
  }

  getOsc(time, frequency, index) {
    const osc = this.oscillators[index]
    const t = time * frequency * osc.factor + osc.phase
    let value = 0
    switch (osc.kind) {
      case "sine":
        value = Math.sin(2 * Math.PI * t)
        break
      case "square":
        value = Math.sign(Math.sin(2 * Math.PI * t))
        break
      case "sawtooth":
        value = 2 * (t - Math.floor(t + 0.5))
        break
      case "triangle":
        value = 2 * Math.abs(2 * (t - Math.floor(t + 0.5))) - 1
        break
      case "noise":
        value = Math.random() * 2 - 1
        break
    }
    return value * osc.amplitude
  }

  getSample(time, frequency) {
    let sample = 0
    for (let i = 0; i < this.oscillators.length; i++) {
      sample += this.getOsc(time, frequency, i)
    }
    return sample * this.scale
  }

  getAllExcept(time, frequency, index) {
    let sample = 0
    for (let i = 0; i < this.oscillators.length; i++) {
      if (i !== index) {
        sample += this.getOsc(time, frequency, i)
      }
    }
    return sample * this.scale
  }
}

class AdditiveSynthEditor {
  constructor(synth) {
    this.synth = synth

    this.selected = null

    this.element = h(".additive-synth-editor.card", {style: {width: "300px"}}, [
      h("h1", "Additive Synth Editor"),
      this.canvas = h("canvas.additive-synth-canvas"),
      this.oscList = h(".list")
    ])

    this.ctx = this.canvas.getContext("2d")
    this.updateAll()

    new ResizeObserver(() => this.resize()).observe(this.canvas)
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.draw()
  }

  updateAll() {
    this.createOscs()
    this.draw()
  }

  renormalize() {
    let maxAmplitude = 0
    this.synth.scale = 1
    for (let x = 0; x < 64; x++) {
      const sample = this.synth.getSample(x / 64, 1)
      maxAmplitude = Math.max(maxAmplitude, Math.abs(sample))
    }
    this.synth.scale = maxAmplitude > 0 ? 1 / maxAmplitude : 1
  }

  createOscs() {
    this.oscList.innerHTML = ""
    for (const [index, osc] of this.synth.oscillators.entries()) {
      const item = h(".row", [
        h("select", {
          onchange: (e) => {
            osc.kind = e.target.value
            this.draw()
          }
        }, [
          h("option", { value: "sine", selected: osc.kind === "sine" }, "Sin"),
          h("option", { value: "square", selected: osc.kind === "square" }, "Squ"),
          h("option", { value: "sawtooth", selected: osc.kind === "sawtooth" }, "Saw"),
          h("option", { value: "triangle", selected: osc.kind === "triangle" }, "Tri"),
          h("option", { value: "noise", selected: osc.kind === "noise" }, "Noi")
        ]),
        h("input", {
          type: "number",
          min: 1,
          step: 1,
          value: osc.factor,
          oninput: (e) => {
            osc.factor = parseFloat(e.target.value)
            this.selected = index
            this.draw()
          }
        }),
        h("input", {
          type: "number",
          min: 0,
          max: 1,
          step: 0.01,
          value: osc.amplitude,
          oninput: (e) => {
            osc.amplitude = parseFloat(e.target.value)
            this.selected = index
            this.draw()
          }
        }),
        h("input", {
          type: "number",
          min: 0,
          max: 1,
          step: 0.01,
          value: osc.phase,
          oninput: (e) => {
            osc.phase = parseFloat(e.target.value)
            this.selected = index
            this.draw()
          }
        }),
        h("button", {
          onclick: () => {
            this.synth.oscillators.splice(index, 1)
            this.selected = null
            this.updateAll()
          }
        }, "x")
      ])
      this.oscList.appendChild(item)
    }

    const addButton = h("button", {
      onclick: () => {
        this.synth.addOscillator("sine", 1, 0, 1)
        this.updateAll()
      }
    }, "Add Oscillator")
    this.oscList.appendChild(addButton)
  }

  draw() {
    this.renormalize()

    const width = this.canvas.width
    const height = this.canvas.height
    this.ctx.clearRect(0, 0, width, height)

    this.ctx.lineWidth = 2

    const padding = 12

    if (this.selected !== null) {
      const osc = this.synth.oscillators[this.selected]
      this.ctx.strokeStyle = "#555"
      this.ctx.beginPath()
      for (let x = padding; x < width - padding; x++) {
        const time = (x - padding) / (width - 2 * padding)
        const sample = this.synth.getAllExcept(time, 1, this.selected)
        const y = (1 - (sample + 1) / 2) * (height - 2 * padding) + padding
        if (x === padding) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }
      this.ctx.stroke()
    }

    this.ctx.strokeStyle = "#fff"
    this.ctx.beginPath()
    for (let x = padding; x < width - padding; x++) {
      const time = (x - padding) / (width - 2 * padding)
      const sample = this.synth.getSample(time, 1)
      const y = (1 - (sample + 1) / 2) * (height - 2 * padding) + padding
      if (x === padding) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }
    this.ctx.stroke()
  }
}

// Sequence / Pino Roll

class ChromaticScale {
  constructor() {
    this.root = 440
    this.ocataveSize = 12
    this.subscales = [
      { name: "No Scale", notes: [] },
      { name: "Major", notes: [0, 2, 4, 5, 7, 9, 11] },
      { name: "Minor", notes: [0, 2, 3, 5, 7, 8, 10] },
      { name: "Pentatonic", notes: [0, 2, 4, 7, 9] }
    ]
  }

  getFrequency(note) {
    return this.root * Math.pow(2, note / 12)
  }

  getName(note, includeOctave = true) {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    const index = (note % 12 + 12 + 9) % 12
    const ocatave = Math.floor((note + 9) / 12) + 4
    return names[index] + (includeOctave ? " " + ocatave.toString() : "")
  }
}

class Sequence {
  constructor(scale, length = 8) {
    this.scale = scale
    this.notes = []
    this.length = length
    this.subscale = { kind: scale.subscales[0], base: 0 }
  }

  addNote(time, note, duration) {
    this.notes.push({ time, note, duration })
  }

  removeNotes(time, note) {
    this.notes = this.notes.filter(n => 
      n.time >= time || n.time + n.duration <= time ||
      n.note !== note
    )
  }
}

class SequenceEditor {
  constructor(sequence, audioContext) {
    this.sequence = sequence
    this.divs = 4
    this.audioContext = audioContext
    this.element = h(".sequence-editor.card", {style: {"flex-grow": 1}}, [
      h(".row", [
        h("h1", {style: {"flex-grow": 1}}, "Sequence Editor"),
        h("select", {
          onchange: (e) => {
            this.sequence.subscale.kind = this.sequence.scale.subscales[parseInt(e.target.value)]
            this.draw()
          }
        }, this.sequence.scale.subscales.map((subscale, index) => 
          h("option", { value: index, selected: this.sequence.subscale.kind === subscale }, subscale.name)
        )),
        h("select", {
          onchange: (e) => {
            this.sequence.subscale.base = parseInt(e.target.value)
            this.draw()
          }
        }, new Array(this.sequence.scale.ocataveSize).fill(0).map((_, index) => 
          h("option", {
            value: index,
            selected: this.sequence.subscale.base === index
          }, this.sequence.scale.getName(index, false))
        )),
        h("input", {
          type: "number",
          min: 1,
          step: 1,
          value: this.divs,
          style: {width: "60px"},
          oninput: (e) => {
            this.divs = parseInt(e.target.value)
            this.draw()
          }
        }),
        "×",
        h("input", {
          type: "number",
          min: 1,
          step: 1,
          value: this.sequence.length,
          style: {width: "60px"},
          oninput: (e) => {
            this.sequence.length = parseInt(e.target.value)
            this.draw()
          }
        })
      ]),
      this.canvas = h("canvas.sequence-canvas", {height: 1})
    ])

    this.canvas.oncontextmenu = (e) => {
      e.preventDefault()
      return false
    }

    this.canvas.onpointerdown = (e) => {
      e.preventDefault()
      const { note, time } = this.toNoteSpace(e.offsetX, e.offsetY)

      if (e.button === 0) {
        this.editingNote = { note: Math.floor(note), time: this.snapTime(time, false), duration: 1 / this.divs }
      } else if (e.button === 2) {
        this.sequence.removeNotes(time, Math.floor(note))
      }

      this.draw()

      return true
    }

    this.canvas.onpointermove = (e) => {
      const { note, time } = this.toNoteSpace(e.offsetX, e.offsetY)
      this.cursor = { note, time }

      if (this.editingNote) {
        this.editingNote.duration = Math.max(1 / this.divs, this.snapTime(time - this.editingNote.time, true))
      }

      this.draw()
    }

    this.canvas.onpointerup = (e) => {
      if (this.editingNote) {
        this.sequence.addNote(this.editingNote.time, this.editingNote.note, this.editingNote.duration)
        this.editingNote = null
        this.draw()
      }
    }

    this.canvas.onpointerleave = (e) => {
      this.cursor = null
      this.draw()
    }

    this.canvas.onwheel = (e) => {
      e.preventDefault()
      if (e.deltaY < 0) {
        this.scroll.note -= 1
      } else {
        this.scroll.note += 1
      }
      this.draw()
    }

    this.cursor = null
    this.editingNote = null
    this.playhead = null
    this.scroll = { time: 0, note: 0 }

    this.ctx = this.canvas.getContext("2d")
    this.draw()

    this.audioContext.onplaying.on(({time}) => {
      this.playhead = time
      this.draw()
    })

    this.audioContext.onstop.on(() => {
      this.playhead = null
      this.draw()
    })

    new ResizeObserver(() => this.resize()).observe(this.canvas)
  }

  snapTime(time, round) {
    time = time * this.divs
    if (round) {
      time = Math.round(time)
    } else {
      time = Math.floor(time)
    }
    return time / this.divs
  }

  toNoteSpace(x, y) {
    const padding = 12
    const labelWidth = 24
    const width = this.canvas.width
    const height = this.canvas.height
    const widthPerBeat = (width - 2 * padding - labelWidth) / this.sequence.length
    const heightPerNote = 16

    let time = (x - padding - labelWidth) / widthPerBeat
    let note = (height - padding - y) / heightPerNote

    time -= this.scroll.time
    note -= this.scroll.note

    return { time, note }
  }

  toScreenSpace(time, note) {
    const padding = 12
    const labelWidth = 24
    const width = this.canvas.width
    const height = this.canvas.height
    const widthPerBeat = (width - 2 * padding - labelWidth) / this.sequence.length
    const heightPerNote = 16

    time += this.scroll.time
    note += this.scroll.note

    const x = time * widthPerBeat + padding + labelWidth
    const y = height - padding - note * heightPerNote

    return { x, y }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.draw()
  }

  draw() {
    const width = this.canvas.width
    const height = this.canvas.height
    this.ctx.clearRect(0, 0, width, height)

    const padding = 12
    const labelWidth = 24

    const widthPerBeat = (width - 2 * padding - labelWidth) / this.sequence.length
    const heightPerNote = 16

    // Grid

    this.ctx.beginPath()
    this.ctx.strokeStyle = "#333"
    this.ctx.lineWidth = 2
    for (let i = 0; i <= (height - 2 * padding) / heightPerNote; i++) {
      const y = height - padding - i * heightPerNote
      this.ctx.moveTo(padding + labelWidth, y)
      this.ctx.lineTo(width - padding, y)
    }
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.strokeStyle = "#333"
    this.ctx.lineWidth = 2
    for (let i = 0; i <= this.sequence.length * this.divs; i++) {
      const x = padding + labelWidth + i * widthPerBeat / this.divs
      this.ctx.moveTo(x, padding)
      this.ctx.lineTo(x, height - padding)
    }
    this.ctx.stroke()

    // Subscale

    this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
    for (let i = 0; i <= (height - 2 * padding) / heightPerNote; i++) {
      const note = i - this.scroll.note
      const subscale = this.sequence.subscale
      if (subscale.kind.notes.includes(((note - subscale.base) % this.sequence.scale.ocataveSize + this.sequence.scale.ocataveSize) % this.sequence.scale.ocataveSize)) {
        const y = height - padding - i * heightPerNote
        this.ctx.fillRect(padding + labelWidth, y - heightPerNote, width - 2 * padding - labelWidth, heightPerNote)
      }
    }

    // Beats

    this.ctx.beginPath()
    this.ctx.strokeStyle = "#555"
    this.ctx.lineWidth = 2
    for (let i = 0; i <= this.sequence.length; i++) {
      const x = padding + labelWidth + i * widthPerBeat
      this.ctx.moveTo(x, padding)
      this.ctx.lineTo(x, height - padding)
    }
    this.ctx.stroke()

    // Note Labels

    this.ctx.fillStyle = "#fff"
    this.ctx.font = "10px Noto Sans, sans-serif"
    for (let i = 0; i <= (height - 2 * padding) / heightPerNote; i++) {
      const label = this.sequence.scale.getName(i - this.scroll.note)
      const measurements = this.ctx.measureText(label)
      let y = height - padding - i * heightPerNote - heightPerNote / 2 + measurements.actualBoundingBoxAscent / 2
      let x = padding + labelWidth - measurements.width - 4
      this.ctx.fillText(label, x, y)
    }

    // Notes

    this.ctx.fillStyle = "#fff"
    for (const note of this.sequence.notes) {
      const { x, y } = this.toScreenSpace(note.time, note.note)
      this.ctx.fillRect(x, y - heightPerNote, note.duration * widthPerBeat, heightPerNote)
    }

    if (this.editingNote) {
      const { x, y } = this.toScreenSpace(this.editingNote.time, this.editingNote.note)
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      this.ctx.fillRect(x, y - heightPerNote, this.editingNote.duration * widthPerBeat, heightPerNote)
    }

    if (this.cursor) {
      const { x, y } = this.toScreenSpace(this.cursor.time, this.cursor.note)
      this.ctx.strokeStyle = "#f00"
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(x, padding)
      this.ctx.lineTo(x, height - padding)
      this.ctx.stroke()
    }

    if (this.playhead !== null) {
      const { x } = this.toScreenSpace(this.playhead % this.sequence.length, 0)
      this.ctx.strokeStyle = "#0f0"
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(x, padding)
      this.ctx.lineTo(x, height - padding)
      this.ctx.stroke()
    }

  }
}

// Project

class Instrument {
  constructor() {
    this.adsr = new Adsr()
    this.synth = new AdditiveSynth()
    this.synth.addOscillator("sine", 1, 0, 1)
  }
}

class Track {
  constructor(instrument) {
    this.volume = 0.5
    this.instrument = instrument
    this.sequence = new Sequence(new ChromaticScale())
    this.sequence.addNote(0, 0, 1)
  }
}

class Project {
  constructor() {
    this.instruments = []
    this.tracks = []
  }

  addInstrument() {
    const instrument = new Instrument()
    this.instruments.push(instrument)
    return instrument
  }

  addTrack(instrument) {
    const track = new Track(instrument)
    this.tracks.push(track)
    return track
  }

  get length() {
    let length = 0
    for (const track of this.tracks) {
      length = Math.max(length, track.sequence.length)
    }
    return length
  }

  render(buffer) {
    const data = buffer.getChannelData(0)
    const length = this.length
    for (const track of this.tracks) {
      for (let repeat = 0; repeat < Math.ceil(length / track.sequence.length); repeat++) {
        for (const note of track.sequence.notes) {
          const startTime = note.time + repeat * track.sequence.length
          const startSample = Math.floor(startTime * buffer.sampleRate)
          const endSample = Math.floor((startTime + note.duration + track.instrument.adsr.release) * buffer.sampleRate)
          const frequency = track.sequence.scale.getFrequency(note.note)
          for (let i = startSample; i < endSample; i++) {
            const time = (i / buffer.sampleRate - note.time) - repeat * track.sequence.length
            const sample = track.instrument.synth.getSample(time, frequency)
            const level = track.instrument.adsr.getLevel(time, note.duration)
            data[i] += sample * level * track.volume
          }
        }
      }
    }
  }
}

class EventEmitter {
  constructor() {
    this.callbacks = new Set()
  }

  on(callback) {
    this.callbacks.add(callback)
  }

  trigger(...args) {
    for (const callback of this.callbacks) {
      callback(...args)
    }
  }
}

class AudioEngine {
  constructor(project) {
    this.project = project
    this.isPlaying = false
    this.audioContext = new AudioContext()
    this.source = null
    this.gain = this.audioContext.createGain()
    this.gain.connect(this.audioContext.destination)
    this.gain.gain.value = 0.8

    this.onplaying = new EventEmitter()
    this.onplay = new EventEmitter()
    this.onstop = new EventEmitter()
  }

  play() {
    this.isPlaying = true

    const buffer = new AudioBuffer({
      length: this.audioContext.sampleRate * this.project.length,
      sampleRate: this.audioContext.sampleRate,
      numberOfChannels: 1
    })
    this.project.render(buffer)

    this.source = this.audioContext.createBufferSource()
    this.source.buffer = buffer
    this.source.onended = () => {
      this.isPlaying = false
      this.source = null
      this.onstop.trigger()
    }
    this.source.connect(this.gain)
    this.source.start()

    const startTime = this.audioContext.currentTime

    const anim = () => {
      if (this.source && this.isPlaying) {
        this.onplaying.trigger({time: this.audioContext.currentTime - startTime})
        window.requestAnimationFrame(() => anim())
      }
    }

    anim()

    this.onplay.trigger()
  }

  stop() {
    this.isPlaying = false
    this.source.stop()
  }
}

class PlayPauseButton {
  constructor(audioEngine) {
    this.audioEngine = audioEngine

    this.element = h("button", {
      onclick: () => {
        if (this.audioEngine.isPlaying) {
          this.audioEngine.stop()
        } else {
          this.audioEngine.play()
        }
        this.update()
      }
    }, "Play")

    this.audioEngine.onplay.on(() => this.update())
    this.audioEngine.onstop.on(() => this.update())
  }

  update() {
    this.element.textContent = this.audioEngine.isPlaying ? "Stop" : "Play"
  }
}   

class ProjectEditor {
  constructor(project, audioEngine) {
    this.project = project
    this.audioEngine = audioEngine
    this.element = h(".root", [
      h(".menu", [
        h("h1", "Project"),
        h("button", {
          onclick: () => {}
        }, "Load"),
        h("button", {
          onclick: () => {}
        }, "Save"),
        new PlayPauseButton(this.audioEngine).element
      ]),
      this.tracks = h(".tracks")
    ])

    window.onkeydown = (e) => {
      if (e.target.tagName === "INPUT") {
        return
      }

      if (e.code === "Space") {
        if (this.audioEngine.isPlaying) {
          this.audioEngine.stop()
        } else {
          this.audioEngine.play()
        }
      }
    }

    this.updateAll()
  }

  updateAll() {
    this.createTracks()
  }

  createTracks() {
    this.tracks.innerHTML = ""
    for (const [index, track] of this.project.tracks.entries()) {
      const trackElement = h(".track", [
        h(".track-header", [
          h("h1", {style: {"flex-grow": 1}}, "Track " + (index + 1)),
          h(".row", [
            h("label", "Volume"),
            h("input", {
              type: "range",
              min: 0,
              max: 1,
              step: 0.01,
              value: track.volume,
              oninput: (e) => {
                track.volume = parseFloat(e.target.value)
              }
            })
          ]),
          h("button", {
            onclick: () => {
              this.project.tracks.splice(index, 1)
              this.updateAll()
            }
          }, "x")
        ]),
        h(".track-synth", [
          new AdsrEditor(track.instrument.adsr).element,
          new AdditiveSynthEditor(track.instrument.synth).element,
          new SequenceEditor(track.sequence, this.audioEngine).element
        ])
      ])
      this.tracks.appendChild(trackElement)
    }

    const addButton = h("button", {
      onclick: () => {
        this.project.addTrack(this.project.addInstrument())
        this.updateAll()
      }
    }, "Add Track")
    this.tracks.appendChild(addButton)
  }
}


// Main

const project = new Project()
const audioEngine = new AudioEngine(project)
const editor = new ProjectEditor(project, audioEngine)
document.body.appendChild(editor.element)
