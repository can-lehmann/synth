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

const adsrEditor = new AdsrEditor(new Adsr())
document.body.appendChild(adsrEditor.element)
