const featureTypes = ['creature:air', 'creature:water', 'creature:earth', 'hazard:techtonic/volcanic', 'hazard:precipitous:(chasm, crevasse, abyss, rift)', 'hazard:ensnaring:(bog, mire, tarpit, quicksand, etc.)', 'hazard:defensive:(trap created by local creature /faction)', 'hazard:meteorological:(blizzard, thunderstorm, sandstorm, etc.)', 'hazard:seasonal:(fire, flood, avalanche, etc.)', 'hazard:impairing:(mist, fog, murk, gloom, miasma, etc.)', 'obstacle:defensive:(trap created by local creature /faction)', 'obstacle:impenetrable:(cliff , escarpment, crag, bluff , etc.)', 'obstacle:penetrable:(dense forest/jungle, etc.)', 'obstacle:traversable:(river, ravine, crevasse, chasm, abyss, etc.)', 'landmark:plant/tree', 'landmark:earth/rock', 'landmark:megalith/obelisk/statue', 'resource:game/hide/fur', 'resource:timber/clay/stone', 'resource:herb/spice/dye', 'resource:base mineral:(copper, tin, iron, quartz, amethyst, etc.)', 'resource:precious mineral:(silver, gold, diamond, etc.)', 'ruin:earthworks', 'ruin:bridge', 'ruin:mine/quary', 'ruin:bunkers', 'ruin:aqueduct/canal', 'ruin:graveyard/necropolis', 'ruin:barrow/tomb/crypt', 'ruin:shrine/temple', 'ruin:stadium', 'ruin:farm/estate/tower', 'ruin:prison', 'ruin:library/museum/school', 'ruin:stronghold/castle', 'ruin:town']

const FeatureData = {
  "t": {
    input: ["type", "select", featureTypes, 0, "number"],
    cost(val) {
      let cost = 2

      if ([17, 18, 19].includes(val))
        cost = 4
      else if (val == 20)
        cost = 6
      else if (val == 21)
        cost = 10
      else if (val >= 22)
        cost = 25

      return cost
    }
  },
  "x": {
    input: ["px", "minmax", [0, 6000], 0, "number"],
    cost() {
      return 1
    }
  },
  "y": {
    input: ["py", "minmax", [0, 6000], 0, "number"],
    cost() {
      return 1
    }
  },
}

//create a blank feature 
const Blank = ()=>{
  return Object.fromEntries(Object.entries(FeatureData).map(([key,d])=>[key, d.input[3]]))
}

const EditFeature = (app,id)=>{
  const html = app.html
  //get state and realm 
  const {realm, tData, view} = app.state
  const R = tData[realm]

  //current features 
  let _f = R.features[id] === undefined ? Blank() : R.features[id]

  //update payload with data information 
  const update = (e,key)=>{
    let _d = FeatureData[key]
    //update feature 
    _f[key] = _d.input[4] == "number" ? Number(e.target.value) : e.target.value
    R.features[id] = _f
    console.log(_f)
    //save 
    R.save()
    //view 
    app.setState({
      view: "realm.features."+id
    })
  }

  //make an input based upon the data type 
  const makeDiv = {
    select(key, d) {
      return html`
        <select class="mv1" value=${_f[key]} onChange=${(e)=>update(e, key)}>
          ${d[2].map((val,j)=>html`<option value=${j}>${val}</option>`)}
        </select>
        `
    },
    minmax(key, d) {
      return html`<input type="number" min=${d[2][0]} max=${d[2][1]} value=${_f[key]} onInput=${(e)=>update(e, key)}></input>`
    }
  }

  //provide a form to input data 
  return html`
  <div class="ba ma1 ph2">
    <h3 class="ma0">Feature #${id + 1}</h3>
    <div class="flex flex-inline items-center justify-around">
      ${Object.entries(FeatureData).map(([key,val])=>html`<div class="ma1"><span class="b mh1">${val.input[0]}</span>${makeDiv[val.input[1]](key, val.input)}</div>`)}
    </div>
  </div>`
}

const ShowFeature = (app,id)=>{
  const html = app.html

  //get state and realm 
  const {realm, tData} = app.state
  const R = tData[realm]
  //current features 
  let _f = R.features[id]
  let _type = featureTypes[_f.t]

  return html`<div>Feature #${id + 1} [${_f.x},${_f.y}] <span class="mh2">${_type}</span></div>`
}

const FeatureUI = (app)=>{
  const html = app.html

  //get state and realm 
  const {tokens, realm, tData, view} = app.state
  const R = tData[realm]
  //create array for loop 
  const fids = Array.from({
    length: R.attributes.features
  }, (v,i)=>i);
  //determine view and look for feature id 
  const _view = view.split(".")

  const updateView = (view)=>app.setState({
    view
  })

  //show individual features 
  let _feature = (id)=>{
    //if owned give edit button
    let owned = ()=>html`<div class="dim pa1 ba b--green pointer" onClick=${()=>updateView("realm.features." + id)}>Edit</div>`

    //display edit if owned and selected   
    if (tokens.includes(R.id) && id.toString() == _view[2]) {
      return EditFeature(app, id)
    } else {
      if (R.features[id] === undefined) {
        //if undefinded show nothing 
        return html`<div class="flex items-center justify-between ma1 pa1 ph3 ba"><div>Feature #${id + 1} not set.</div>${tokens.includes(R.id) ? owned() : ""}</div>`
      } else {
        //show if defined 
        return html`<div class="flex items-center justify-between ma1 pa1 ph3 ba">${ShowFeature(app, id)}${tokens.includes(R.id) ? owned() : ""}</div>`
      }
    }
  }

  return html`
  <div class="mh2">${fids.map(_feature)}</div>
  `
}

export {FeatureUI}
