/*
  Storage
*/
const DB = localforage.createInstance({
  name: "Realms:Fantasy",
})

import {FeatureUI} from "./features.js"

//Pull state from blockchain
//const currentState = "https://nftstorage.link/ipfs/bafybeidi5sdbptoo7ltq3zxqg3rkqzyqzful6rzsmnfmlw7mpm43y6kw34/"
const getJSON = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        resolve(xhr.response);
      } else {
        reject(status);
      }
    }
    ;
    xhr.send();
  }
  );
};

const RealmState = async(R)=>{
  let attr = R.attributes
  let id = attr.order.toString()

  attr.latitude = attr.latitude.toFixed(1)
  R.id = id
  R.heightmap = attr.heightmap
  //pull from storage 
  let {features} = await DB.getItem(id) || {
    features: []
  }
  //set features 
  R.features = features

  //save state 
  R.save = function() {
    let _R = {
      features: this.features
    }
    DB.setItem(id, _R)
  }
}

const SubView = (app)=>{
  const _view = app.state.view.split(".")

  if (_view[1] === undefined)
    return ""
  else if (_view[1] == "features")
    return FeatureUI(app)
}

const FeatureMarker = (app,f,i)=>{
  const html = app.html  
  //adjust for size - and size of marker 16px by 18px 
  let p = [f.x,f.y].map((v,i) => ((v<0?0:v>6000?6000:v)*800/6000)-(i == 0 ? 8:18))
  
  return html`<div class="absolute flex" style="top: ${p[1]}px;left: ${p[0]}px;"><div class="feature-marker">➤</div>${i+1}</div>`
}

//Main Realm UI
const RealmUI = (app)=>{
  const html = app.html

  const {tokens, realm, tData, view} = app.state
  const R = tData[realm]

  //handle click to view feature/ruin 
  const handleClick = (id)=>{
    if (id == "Features") {
      app.setState({
        view: "realm.features"
      })
    }
  }

  let n = Object.keys(R.features).length

  //div for all NFT features
  const indicator = (val)=>html`<div class="bg-green br-100" style="width: 15px;height: 15px;"></div>`
  const adiv = (id)=>html`
    <div class="flex items-center justify-around ma1 pa1 ba ${id == "Features" ? "b--green pointer" : ""}" style="width: 175px;" onClick=${()=>handleClick(id)}>
      <div>${id}:</div> 
      <div class="flex">${R.attributes[id.toLowerCase()]}</div>
      ${id == "Features" ? indicator() : ""}
    </div>`

  return html`
      <div class="mh3 ph2">
        <h2>${R.name}, ${R.heightmap} ${tokens.includes(realm) ? " [Owned]" : ""}</h2>
        <div class="flex">
          <div class="pa2">
            <div>
              <div class="flex flex-wrap f4">${["Seed", "Latitude", "Temperature", "Precipitation"].map(adiv)}</div>
              <div class="flex flex-wrap f4">${["People", "Features", "Ruins"].map(adiv)}</div>
            </div>
            ${SubView(app)}
          </div>
          <div style="min-width: 800px;min-height: 800px;"> 
            <div class="absolute">
              <img id="map" src=${R.image} width="800" height="800"></img>
              ${R.features.map((f,i)=>FeatureMarker(app, f, i))}
            </div>
          </div>
        </div>
      </div>
    `
}

//View the Realms of a particular user address 
const MyRealms = (app)=>{
  const html = app.html

  const smallRealm = (id)=>{
    let {name, image} = app.state.tData[id]

    return html`
      <div class="link ma1 pa2 dim ba bw1 dib black" onClick=${()=>app.setRealm(id)}>
        <div class="tc">${name}</div>
        <img src=${image} width="100" height="100"></img>
      </div>
      `
  }

  const {tokens, tData} = app.state
  if (tokens.length == 0)
    return html`
        <div class="w-100 mv2 ph5">
          <a class="tc f6 link dim dib pv2 br2 white bg-dark-green w-100" href="https://www.stargaze.zone/launchpad/stars1avmaqtmxw9g43mgpxzuhv074gmzm5wharxrvlsfp4ze7246gyqdqtr9a0l">Get a Realm on Stargaze</a>
        </div>
      `

  return html`
      <div class="w-90">
        <h2>My Realms</h2>
        <div class="flex">
          ${tokens.map(id=>smallRealm(id))}
        </div>
      </div>
    `
}

export {RealmUI, MyRealms, RealmState}
