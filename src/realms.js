/*
  Storage
*/
const DB = localforage.createInstance({
  name: "Realms:Fantasy",
})

import {FeatureUI, bFeature} from "./features.js"
import {RuinUI, bRuin} from "./ruins.js"
import {PeopleUI, bPeople} from "./people.js"

const Blank = (vid)=>{
  if (vid == "features")
    return bFeature()
  else if (vid == "ruins")
    return bRuin()
  else if (vid == "people")
    return bPeople()
}

//check differences - get most current state 
const Deltas = (R,qBlock,vid,id)=>{
  let blank = Blank(vid)
  const current = Object.assign({}, blank)

  const states = {
    local: R[vid][id] === undefined ? {} : R[vid][id],
    state: R.state[vid][id] ? R.state[vid][id] : {},
    blank
  }

  //check if submitted in block
  const uid = [R.id, vid.charAt(0), id].join(".")
  const q = qBlock.filter(q=>q.slice(0, 3).join(".") == uid)
  states.queue = q[0] === undefined ? {} : Object.fromEntries(q[0].slice(3))

  //provide most relevent state 
  const color = ["bg-light-blue", "bg-light-green", "bg-green", ""]
  //query in this order
  const order = ["local", "queue", "state", "blank"]
  //track deltas 
  const delta = []
  const show = {}
  //loop through what should be in feature 
  Object.keys(current).forEach(k=>{
    //find the highest order that has data 
    let o = order.filter(_o=>states[_o][k] !== undefined)
    //push delta 
    if (states.local[k] != states.state[k] && states.local[k] != states.queue[k]) {
      delta.push([k, states.local[k]])
    }

    const i = order.indexOf(o[0])

    show[k] = states[o[0]][k]
    current[k] = {
      val: show[k],
      order: i,
      color: color[i],
      q: o.includes("queue")
    }
  }
  )

  return {
    i : id,
    view : vid,
    what: current,
    state : R.state[vid][id], 
    delta
  }
}

//main state for ruins 
const RealmState = async(R)=>{
  let attr = R.attributes
  let id = attr.order.toString()

  attr.latitude = attr.latitude.toFixed(1)
  R.id = id
  R.heightmap = attr.heightmap
  //pull from storage 
  let {features, ruins, people} = await DB.getItem(id) || {}
  //set subs 
  R = Object.assign(R, {
    features: features || [],
    ruins: ruins || [],
    people: people || []
  })

  //delta functions 
  R.deltas = Deltas

  //save local state 
  R.save = function() {
    let _R = {
      features: this.features,
      ruins: this.ruins,
      people: this.people
    }
    DB.setItem(id, _R)
  }
}

const SubView = (app)=>{
  const view = app.state.view.split(".")

  let subs = {
    "features": FeatureUI,
    "ruins": RuinUI,
    "people": PeopleUI,
  }

  if (view[1] === undefined || !subs[view[1]])
    return ""

  return subs[view[1]](app)
}

const MapMarker = (app,R,owned,{i,what,view,state})=>{
  //don't do markers that don't exist 
  if(i >= R.attributes[view] || (!owned && !state)) 
    return ""

  //determine if there is a position 
  let _p = [what.x.val, what.y.val]
  if(_p.join("")=="00")
    return ""
  
  const html = app.html
  //adjust for size - and size of marker 16px by 18px 
  let p = _p.map((v,i)=>((v < 0 ? 0 : v > 6000 ? 6000 : v) * 800 / 6000) - (i == 0 ? 8 : 18))

  return html`<div class="absolute flex" style="top: ${p[1]}px;left: ${p[0]}px;"><div class="feature-marker">➤</div>${view.charAt(0)}${i + 1}</div>`
}

//Main Realm UI
const RealmUI = (app)=>{
  const html = app.html

  const {tokens, realm, tData, qBlock, view} = app.state
  const R = tData[realm]
  const show = view.split(".")
  const owned = tokens.includes(realm)

  //handle click to view feature/ruin 
  const handleClick = (id)=>{
    app.setState({
      view: "realm." + id.toLowerCase()
    })
  }

  //create array for loop 
  const len = [R.attributes.features,R.attributes.people]
  const ids = Array.from({
      length: len[0] > len[1] ? len[0] : len[1]
  }, (v,i)=>i);

  //div for all NFT features
  const indicator = (val)=>html`<div class="bg-green br-100" style="width: 15px;height: 15px;"></div>`
  const adiv = (id)=>html`
    <div class="flex items-center justify-around ma1 pa1 ba" style="width: 175px;">
      <div>${id}:</div> 
      <div class="flex">${R.attributes[id.toLowerCase()]}</div>
    </div>`

  const button = (id,side)=>html`
    <div class="flex items-center justify-around dim pointer pa1 ${show[1] == id.toLowerCase() ? "bg-light-blue" : "bg-light-silver"} ${side}" onClick=${()=>handleClick(id)}>
      <div>${id}:</div> 
      <div class="flex">${R.attributes[id.toLowerCase()]}</div>
    </div>`

  return html`
      <div class="mh3 ph2">
        <h2 class="ml2">${R.name}, ${R.heightmap} ${owned ? " [Owned]" : ""}</h2>
        <div class="flex">
          <div class="pa2">
            <div>
              <div class="flex flex-wrap justify-center f4">${["Seed", "Latitude", "Temperature", "Precipitation"].map(adiv)}</div>
              <div class="flex justify-center f4">
                ${button("People", "br--left br2")}
                ${button("Features", "")}
                ${button("Ruins", "br--right br2")}
              </div>
            </div>
            ${SubView(app)}
          </div>
          <div style="min-width: 800px;min-height: 800px;"> 
            <div class="absolute">
              <img id="map" src=${R.image} width="800" height="800"></img>
              ${["features","ruins","people"].map(w => ids.map(i => MapMarker(app,R,owned,R.deltas(R, qBlock, w, i))))}
            </div>
          </div>
        </div>
      </div>
    `
}

export {RealmUI, RealmState}
