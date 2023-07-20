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
  const {realm, tData, txQueue, qBlock} = app.state
  const R = tData[realm]
  //current feature
  let local = R.features[id] === undefined ? {} : R.features[id]
  const {f, delta} = R.deltas(R, qBlock, "features", id)

  //update payload with data information 
  const update = (e,key)=>{
    let _d = FeatureData[key]
    //update feature 
    local[key] = _d.input[4] == "number" ? Number(e.target.value) : e.target.value
    R.features[id] = local
    //save 
    R.save()
    app.setView(vid)
  }

  //check if in queue 
  const uid = R.id + ".f." + id
  const inQueue = txQueue.map(q=>q.payload.slice(0, 3).join(".")).indexOf(uid)
  //submit to queue 
  const submitDeltas = ()=>{
    let q = {
      name: R.name,
      what: "feature " + (id + 1),
      cost: delta.length,
      payload: [R.id, "f", id, ...delta]
    }
    const push = ()=>{
      inQueue == -1 ? app.state.txQueue.push(q) : app.state.txQueue[inQueue] = q
      app.setView(vid)
    }
    return html`<div class="b tc white dim mb1 pa1 br2 bg-green pointer" onClick=${push}>Submit Changes</div>`
  }

  //make an input based upon the data type 
  const makeDiv = {
    select(key, d) {
      return html`
        <select class="mv1" value=${f[key].val} onChange=${(e)=>update(e, key)}>
          ${d[2].map((val,j)=>html`<option value=${j}>${val}</option>`)}
        </select>
        `
    },
    minmax(key, d) {
      return html`<input type="number" min=${d[2][0]} max=${d[2][1]} value=${f[key].val} onInput=${(e)=>update(e, key)}></input>`
    }
  }

  //provide a form to input data 
  return html`
  <div class="ba ma1 ph2">
    <h3 class="ma0">Feature #${id + 1}</h3>
    <div class="flex flex-inline items-center justify-around">
      ${Object.entries(FeatureData).map(([key,val])=>html`
        <div class="flex items-center ma1">
          <span class="b mh1">${val.input[0]}</span>${makeDiv[val.input[1]](key, val.input)}
          <div class="${f[key].color} br-100" style="width: 15px;height: 15px;"></div>
        </div>`)}
    </div>
    <div>${delta.length > 0 ? submitDeltas() : ""}</div>
  </div>`
}

const FeatureUI = (app)=>{
  const html = app.html

  //declare sub pieces for larger component
  const vid = "features"
  const changes = (hasDelta)=>hasDelta ? html`<div class="bg-orange br-100 mh2" style="width: 15px;height: 15px;"></div>` : ""
  const shortOwned = (f,hasDelta)=>html`<div class="flex"><span class="mh2">${featureTypes[f.t.val]}</span>[${f.x.val},${f.y.val}]${changes(hasDelta)}</div>`
  const short = (f)=>html`<div><span class="mh2">${featureTypes[f.t]}</span>[${f.x},${f.y}]</div>`
  const format = FeatureData

  //call the view 
  return app.views.realmFeature(app,{vid,format,short,shortOwned})
}

export {FeatureUI, Blank as bFeature}

//∆
