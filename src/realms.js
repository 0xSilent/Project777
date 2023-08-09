/*
  Storage
*/
const DB = localforage.createInstance({
  name: "Realms:Fantasy",
})

import * as Features from "./features.js"
import * as Ruins from "./ruins.js"
import * as People from "./people.js"

const Save = (vid,data) => {
  if (vid == "features")
    return Features.Save(data)
  else if (vid == "ruins")
    return Ruins.Save(data)
  else if (vid == "people")
    return People.Save(data)
}

const Blank = (vid)=>{
  if (vid == "features")
    return Features.Blank()
  else if (vid == "ruins")
    return Ruins.Blank()
  else if (vid == "people")
    return People.Blank()
}

//check differences - get most current state 
const Deltas = (R,vid,id)=>{
  const blank = Blank(vid)
  
  const states = {
    local: R[vid][id] === undefined ? {} : R[vid][id],
    state: R.state[vid][id] ? R.state[vid][id] : {},
    random : R.random[vid][id],
    blank
  }

  //query in this order
  const order = ["local", "state", "blank"]
  let delta = false 
  let isBlank = true
  //loop through what should be in feature 
  const what = Object.keys(blank).map(k =>{
    //find the highest order that has data 
    let o = order.filter(_o=>states[_o][k] !== undefined)
    const i = order.indexOf(o[0])
    //blank 
    if(i != 2){
      isBlank = false
    }
    //check for deltas 
    if(i == 0 && JSON.stringify(states.local[k]) != JSON.stringify(states.state[k]))
      delta = true
    else if(i > 1)
      delta = true 

    // make sure blank is filled 
    let val = i == -1 ? states.random[k]: states[o[0]][k]
    
    return [k,{
      val,
      order: i,
      color: i == 1 ? "bg-light-green" : "bg-light-blue",
    }]
  }
  )

  return {
    i : id,
    view : vid,
    what: Object.fromEntries(what),
    isBlank,
    delta
  }
}

const GenRandom = (rid,what,n) => {
  const seed = ["Realms777:Fantasy",rid,what].join(".")

  if(what=="people")
    return Array.from({length:n},(v,i)=>People.random({seed:seed+"."+i}))
  else if(what=="features")
    return Array.from({length:n},(v,i)=>Features.random({seed:seed+"."+i}))
  if(what=="ruins")
    return Array.from({length:n},(v,i)=>Ruins.random({seed:seed+"."+i}))
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

  //random 
  R.random = {
    people : GenRandom(id,"people",attr.people),
    features : GenRandom(id,"features",attr.features),
    ruins : GenRandom(id,"ruins",attr.ruins)
  }

  //delta functions 
  R.deltas = Deltas

  //get uid for submit to block 
  R.uid = (what,i) => {
    return what == "features" ? i : what == "people" ? attr.features + i : attr.features + attr.people + i
  }

  //need full count of values for state 
  let n = [attr.features,attr.features+attr.people,attr.features+attr.people+attr.ruins]
  // State handling 
  R.state = {
    features: [],
    people: [],
    ruins: []
  }
  
  R._state.forEach((val,i) => {
    if(i < n[0])
      R.state.features.push(!val ? null : Features.Load(val))
    else if(i < n[1])
      R.state.people.push(!val ? null : People.Load(val))
    else 
      R.state.ruins.push(!val ? null : Ruins.Load(val))
  })

  //to blockhain 
  R.toBlockchain = (q) => {
    //loop through paylaod to set tx info 
    let _nft, _what = [], _state = [];
    q.forEach(([rid,what,id]) => {
      _nft = Number(rid)
      _what.push(R.uid(what,id))

      //state data 
      const sd = Save(what,Deltas(R,what,id).what)
      _state.push(LZString.compressToUTF16(JSON.stringify(sd)))
    })
    return [_nft,_what,_state]
  }

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
    "features": Features.UI,
    "ruins": Ruins.UI,
    "people": People.UI,
  }

  if (view[1] === undefined || !subs[view[1]])
    return ""

  return subs[view[1]](app)
}

const MapMarker = (app,R,owned,{i,view,what})=>{
  //don't do markers that don't exist 
  if(i >= R.attributes[view]) 
    return ""

  //determine if there is a position 
  const {x = {val:0}, y = {val:0}} = what
  let _p = [x.val, y.val]
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
  const len = [R.attributes.features,R.attributes.ruins,R.attributes.people]
  const ids = (i) => Array.from({length: len[i]}, (v,i)=>i)

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
                ${button("Features", "br--left br2")}
                ${button("People", "")}
                ${button("Ruins", "br--right br2")}
              </div>
            </div>
            ${SubView(app)}
          </div>
          <div style="min-width: 800px;min-height: 800px;"> 
            <div class="absolute">
              <img id="map" src=${R.image} width="800" height="800"></img>
              ${["features","ruins","people"].map((w,i) => ids(i).map(j => MapMarker(app,R,owned,R.deltas(R, w, j))))}
            </div>
          </div>
        </div>
      </div>
    `
}

export {RealmUI, RealmState}
