import {rSite, dSite} from "./sites.js"

const chance = new Chance()

const Random = {
  siteSeed () {
    return chance.natural()
  },
  site (seed=chance.natural()){
    return rSite({seed,noMD:true})
  },
  random(o={}) {
    let {seed=chance.natural(),sites=[]} = o
    let RNG = new Chance(seed)
    const n = RNG.pickone([3, 4, 5])

    //an array of seeds 
    return {
      nsites:n,
      sites: Array.from({length:n},()=>RNG.natural())
    }
  }
}  

//UI to use for the individual sites within the ruin 
const showSite = (html,seed) => {
  //check if seed exists - generate based on seed 
  const s = Random.site(seed)[0] 
  //UI 
  return html`
  <div class="ba mv1 ph1">
    <div>Areas: ${s.a}</div>
    <div>Themes: ${s.themes.map((t,i) => s.sp[i] ? s.sp[i] : dSite.Themes[t]).join(", ")}</div>
  </div>`
}

const Data = {
  "x": ["px", "minmax", [0, 6000], 0, "number"],
  "y": ["py", "minmax", [0, 6000], 0, "number"],
  "nsites": ["n", "disabled"],
  "sites": ["sites", "arr.nsites.seed", [Random.siteSeed], [], "number", showSite],
}

//save / load state - collapse everything to an array 
const dataArray = ["x","y","sites"]
const Save = (p)=>dataArray.map(id=>p[id] ? p[id].val : Data[id][3])
const Load = (d)=>Object.fromEntries(d.map((_d,i)=>[dataArray[i], _d]))

//create a blank feature 
const Blank = ()=>{
  return Object.fromEntries(Object.entries(Data).map(([key,d])=>[key, d[3]]))
}

const UI = (app)=>{
  const html = app.html

  //declare sub pieces for larger component
  const vid = "ruins"
  const changes = (hasDelta)=>hasDelta ? html`<div class="bg-orange br-100 mh2" style="width: 15px;height: 15px;"></div>` : ""
  
  const short = ({sites})=> html`<div>${sites.map((s,i)=> showSite(html,s))}</div>`

  const shortOwned = ({sites},hasDelta)=> {
    return html`<div class="flex items-center"><div>${sites.val.map((s,i)=> showSite(html,s))}</div>${changes(hasDelta)}</div>`
  }

  //call the view 
  return app.views.realmFeature(app, {
    vid,
    format : Data,
    short,
    shortOwned,
  })
}

const random = Random.random
export {UI, Blank, random, Save, Load}
