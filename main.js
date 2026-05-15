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
}

class AdsrEditor {
  constructor(adsr) {
    this.adsr = adsr
    this.element = h(".adsr-editor.card", [
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
    this.ctx.lineTo(this.adsr.attack / 5 * (width - 2 * padding) + padding, padding)
    this.ctx.lineTo((this.adsr.attack + this.adsr.decay) / 5 * (width - 2 * padding) + padding, (1 - this.adsr.sustain) * (height - 2 * padding) + padding)
    this.ctx.lineTo((this.adsr.attack + this.adsr.decay + 1) / 5 * (width - 2 * padding) + padding, (1 - this.adsr.sustain) * (height - 2 * padding) + padding)
    this.ctx.lineTo((this.adsr.attack + this.adsr.decay + 1 + this.adsr.release) / 5 * (width - 2 * padding) + padding, height - padding)

    this.ctx.stroke()
  }
}

// Additive Synth

class AdditiveSynth {
  constructor() {
    this.oscillators = []
  }

  addOscillator(kind, factor, phase, amplitude) {
    this.oscillators.push({ kind, factor, phase, amplitude })
  }

  getSample(time, frequency) {
    let sample = 0
    for (const osc of this.oscillators) {
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
      }
      sample += value * osc.amplitude
    }
    return sample
  }
}

class AdditiveSynthEditor {
  constructor(synth) {
    this.synth = synth
    this.element = h(".additive-synth-editor.card", [
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
          h("option", { value: "sine", selected: osc.kind === "sine" }, "Sine"),
          h("option", { value: "square", selected: osc.kind === "square" }, "Square"),
          h("option", { value: "sawtooth", selected: osc.kind === "sawtooth" }, "Sawtooth"),
          h("option", { value: "triangle", selected: osc.kind === "triangle" }, "Triangle"),
        ]),
        h("input", {
          type: "number",
          min: 1,
          step: 1,
          value: osc.factor,
          oninput: (e) => {
            osc.factor = parseFloat(e.target.value)
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
            this.draw()
          }
        }),
        h("button", {
          onclick: () => {
            this.synth.oscillators.splice(index, 1)
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
    const width = this.canvas.width
    const height = this.canvas.height
    this.ctx.clearRect(0, 0, width, height)

    this.ctx.strokeStyle = "#fff"
    this.ctx.lineWidth = 2

    const padding = 12

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
  constructor(root) {
    this.root = root
    this.length = 12
  }

  getFrequency(note) {
    return this.root * Math.pow(2, note / this.length)
  }
}

class Sequence {
  constructor(scale, length = 4) {
    this.scale = scale
    this.notes = []
    this.length = length
  }

  addNote(time, note, duration) {
    this.notes.push({ time, note, duration })
  }
}

class SequenceEditor {
  constructor(sequence) {
    this.sequence = sequence
    this.element = h(".sequence-editor.card", [
      h("h1", "Sequence Editor"),
      this.canvas = h("canvas.sequence-canvas")
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

    const padding = 12

    const widthPerBeat = (width - 2 * padding) / this.sequence.length
    const heightPerNote = 16

    this.ctx.beginPath()
    this.ctx.strokeStyle = "#333"
    this.ctx.lineWidth = 2
    for (let i = 0; i <= (height - 2 * padding) / heightPerNote; i++) {
      const y = height - padding - i * heightPerNote
      this.ctx.moveTo(padding, y)
      this.ctx.lineTo(width - padding, y)
    }
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.strokeStyle = "#555"
    this.ctx.lineWidth = 2
    for (let i = 0; i <= this.sequence.length; i++) {
      const x = padding + i * widthPerBeat
      this.ctx.moveTo(x, padding)
      this.ctx.lineTo(x, height - padding)
    }
    this.ctx.stroke()

    for (const note of this.sequence.notes) {
      const x = padding + note.time / this.sequence.length * (width - 2 * padding)
      const y = height - padding - (note.note + 1) * heightPerNote
      const w = note.duration / this.sequence.length * (width - 2 * padding)
      const h = heightPerNote - 2

      this.ctx.fillStyle = "#fff"
      this.ctx.fillRect(x, y, w, h)
    }

  }
}

// Main

const adsrEditor = new AdsrEditor(new Adsr())
document.body.appendChild(adsrEditor.element)

const synth = new AdditiveSynth()
synth.addOscillator("sine", 1, 0, 1)

const synthEditor = new AdditiveSynthEditor(synth)
document.body.appendChild(synthEditor.element)

const scale = new ChromaticScale(440)
const sequence = new Sequence(scale)
sequence.addNote(0, 0, 0.5)
sequence.addNote(0.5, 4, 0.5)
sequence.addNote(1, 7, 0.5)
sequence.addNote(1.5, 12, 0.5)

const sequenceEditor = new SequenceEditor(sequence)
document.body.appendChild(sequenceEditor.element)
