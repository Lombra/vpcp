// const fs = require("fs")

const collections = [
	"Templates",
	"Controls",
	"Shadows",
	"Gradient",
]

  // firstCharLowerCase = function(str) {
    // return str.charAt(0).toLowerCase() + str.slice(1)
  // }

  // stripPrefix = function(str) {
    // return str.replace(prefixMatch, '')
  // }

  // parseBooleans = function(str) {
    // if (/^(?:true|false)$/i.test(str)) {
      // str = str.toLowerCase() === 'true'
    // }
    // return str
// }

function parseNumber(str) {
	if (!isNaN(str)) {
		str = str % 1 === 0 ? parseInt(str, 10) : parseFloat(str)
	}
	return str
}

function parse(xml, isCollection) {
	var data = collections.includes(xml.nodeName) ? [] : {}

	var isText = xml.nodeType === 3,
		isElement = xml.nodeType === 1,
		body = xml.textContent && xml.textContent.trim(),
		hasChildren = xml.children && xml.children.length,
		hasAttributes = xml.attributes && xml.attributes.length

	// if it's text just return it
	if (isText) { return xml.nodeValue.trim() }

	// if it doesn't have any children or attributes, just return the contents
	if (!hasChildren && !hasAttributes) { return body }

	// if it doesn't have children but _does_ have body content, we'll use that
	if (!hasChildren && body.length) { data.text = body }

	// if it's an element with attributes, add them to data.attributes
	if (isElement && hasAttributes) {
		for (attribute of xml.attributes) {
			data[attribute.name] = parseNumber(attribute.value)
		}
	}

	// recursively call #parse over children, adding results to data
	for (child of xml.children) {
		var name = child.nodeName

		if (collections.includes(xml.nodeName)) {
			// if we've encountered a second instance of the same nodeType, make our
			// representation of it an array
			// if (!data[name]) data[name] = []

			// and finally, append the new child
			data.push(parse(child, true))
		} else {
			// if we've not come across a child with this nodeType, add it as an object
			// and return here
			// if (!_.has(data, name)) {
				// data[name] = parse(child)
				data[name.charAt(0).toLowerCase() + name.slice(1)] = parse(child)
			// }
		}
	}
	
	if (isCollection) {
		data.tag = xml.nodeName
	}

	return data
}

// convert.rgb.hex = function (args) {
	// var integer = ((Math.round(args[0]) & 0xFF) << 16)
		// + ((Math.round(args[1]) & 0xFF) << 8)
		// + (Math.round(args[2]) & 0xFF);

	// var string = integer.toString(16).toUpperCase();
	// return '000000'.substring(string.length) + string;
// }

function toRGBColor(args) {
	let match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i)
	if (!match) {
		return [0, 0, 0]
	}

	let colorString = match[0]

	if (match[0].length === 3) {
		colorString = colorString.split('').map(char => char + char).join('')
	}

	let integer = parseInt(colorString, 16)
	let r = (integer >> 16) & 0xFF
	let g = (integer >> 8) & 0xFF
	let b = integer & 0xFF

	return [r, g, b]
}

function parseColor(color, alpha) {
	if (alpha) {
		if (color.charAt(0) === '#') {
			var [r, g, b] = toRGBColor(color)
		} else {
			var [r, g, b] = colors[color]
		}
		color = `rgba(${r}, ${g}, ${b}, ${alpha})`
	}
	return color
}

function createControl(type) {
	switch (type) {
		case "Button":
			var element = document.createElement("button")
			break
		case "Slider":
			var element = document.createElement("input")
			element.type = "range"
			break
		case "Text":
			var element = document.createElement("span")
			break
	}
	return element
}

let stylesheet

let rules = {}

function getStyleRule(selector) {
	let rule = rules[selector]
	if (!rule) {
		let index = stylesheet.rules.length
		stylesheet.insertRule(`${selector} {}`, index)
		rule = stylesheet.rules[index].style
		rules[selector] = rule
	}
	return rule
}

function applyStyle(selector, control, element, mainControl) {
	let style = getStyleRule(selector)
	let data = control
	if (data.width) style.width = data.width
	if (data.height) style.height = data.height
	for (let [property, handler] of Styles.global) {
		if (property in data) handler(style, data[property], element, control)
	}
	if (Styles.controls[control.tag]) {
		// for (let [property, handler] of Styles.global) {
			// if (property in data) handler(style, data[property])
		// }
		if (Styles.controls[control.tag].children) {
			for (let [child, selector2, handler] of Styles.controls[control.tag].children) {
				if (child in control) {
					applyStyle(selector + selector2, control[child], element, control)
					if (handler) handler(style, control[child], element, control)
				}
			}
		}
	}
}


let domparser = new DOMParser()

function loadPanel(panelName) {
	let xhr = new XMLHttpRequest()
	xhr.open("GET", `${panelName}.xml`)
	xhr.send()
	xhr.onload = function() {
		let data = this.responseText
		
		let panel = parse(domparser.parseFromString(data, "text/xml")).panel
		console.log(panel)
		
		let link = document.createElement('style')
		document.head.appendChild(link)
		stylesheet = link.sheet
		
		let panelElement = document.getElementById('panel')
		if (panel.background) {
			panelElement.style.backgroundColor = panel.background.color
			panelElement.style.backgroundImage = panel.background.image
		}
		panelElement.style.gridTemplateColumns = `repeat(${panel.grid.columns}, 1fr)`
		panelElement.style.gridTemplateRows = `repeat(${panel.grid.rows}, 1fr)`
		
		if (panel.templates) {
			for (let template of panel.templates) {
				// map each template to a CSS class
				let selector = '.' + template.name
				if (template.tag.toLowerCase() !== 'control') selector += '.' + template.tag.toLowerCase()
				if (template.padding) {
					let style = getStyleRule(selector)
					style.padding = `${template.padding.y} ${template.padding.x}`
				}
				selector += ' .control'
				applyStyle(selector, template)
			}
		}
		
		let n = 1
		
		for (let control of panel.controls) {
			let cell = document.createElement("div")
			panelElement.appendChild(cell)
			cell.style.gridColumnStart = control.position.x
			cell.style.gridColumnEnd = control.position.x + (control.width || 1)
			cell.style.gridRowStart = control.position.y
			cell.style.gridRowEnd = control.position.y + (control.height || 1)
			cell.id = 'control' + n++
			cell.classList.add(control.tag.toLowerCase())
			cell.classList.add('cell')
			if (control.square) cell.classList.add('square')
			if (control.circle) cell.classList.add('circle')
			
			let controlType = ControlTypes[control.tag]
			let element = document.createElement(controlType.tag)
			// assign a dynamic ID that we can use as a selector to apply individual styling
			element.classList.add('control')
			if ('inherits' in control)
				cell.classList.add(control.inherits)
			else
				cell.classList.add('default')
			if (controlType.attributes) {
				for (let [attribute, value] of Object.entries(controlType.attributes)) {
					element[attribute] = value
				}
			}
			applyStyle(`#${cell.id}`, control, element)
			controlType.onCreate(element, control)
			
			const flexPositions = {
				top: 'flex-start',
				left: 'flex-start',
				bottom: 'flex-end',
				right: 'flex-end',
			}
			// if (control.label) {
				// let labelContainer = cell.appendChild(document.createElement("div"))
				// labelContainer.classList.add("label")
				// if (control.label.position) {
					// let [vertical, horizontal] = control.label.position.split(/\s+/)
					// if (vertical && horizontal) {
						// labelContainer.style.alignItems = flexPositions[vertical]
						// labelContainer.style.justifyContent = flexPositions[horizontal]
					// } else if (control.label.position === 'center') {
					// } else {
						// switch (control.label.position) {
							// case 'top' || 'bottom':
								// labelContainer.style.alignItems = flexPositions[control.label.position]
								// break
							// case 'left' || 'right':
								// labelContainer.style.justifyContent = flexPositions[control.label.position]
								// break
						// }
					// }
				// }
				// let label = labelContainer.appendChild(document.createElement("span"))
				// label.textContent = control.label.text
			// }
			if (control.value) {
				let valueContainer = cell.appendChild(document.createElement("div"))
				valueContainer.classList.add("value")
				valueContainer.style.justifyContent = "flex-end"
				valueContainer.style.alignItems = "flex-end"
				let value = valueContainer.appendChild(document.createElement("span"))
				value.textContent = "50%"
			}
			if (control.active) {
				applyStyle(`#${element.id}.pressed, #${element.id}.active`, control.active, element)
			}
			if (control.action && control.action.type === "joy") {
				element.dataset.button = parseInt(control.action.btn)
			}
			if (control.tag === "Slider") {
				element.setAttribute("list", "datalist" + element.id)
				let datalist = cell.appendChild(document.createElement("datalist"))
				datalist.id = "datalist" + element.id
				let option = datalist.appendChild(document.createElement("option"))
				option.value = 50
			}
			let container = cell.appendChild(document.createElement("div"))
			
			if (control.square || control.circle) {
				let img = container.appendChild(document.createElement("img"))
				img.src = "square.png"
			}
			
			container.appendChild(element)
			
			if (controlType.events) {
				for (let [event, callback] of Object.entries(controlType.events)) {
					element.addEventListener(event, callback)
				}
			}
		}
	}
}

loadPanel("Basic2")
