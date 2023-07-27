const chance = new Chance()

const featureTypes = ['creature:air', 'creature:water', 'creature:earth', 'hazard:techtonic/volcanic', 'hazard:precipitous:(chasm, crevasse, abyss, rift)', 'hazard:ensnaring:(bog, mire, tarpit, quicksand, etc.)', 'hazard:defensive:(trap created by local creature /faction)', 'hazard:meteorological:(blizzard, thunderstorm, sandstorm, etc.)', 'hazard:seasonal:(fire, flood, avalanche, etc.)', 'hazard:impairing:(mist, fog, murk, gloom, miasma, etc.)', 'obstacle:defensive:(trap created by local creature /faction)', 'obstacle:impenetrable:(cliff , escarpment, crag, bluff , etc.)', 'obstacle:penetrable:(dense forest/jungle, etc.)', 'obstacle:traversable:(river, ravine, crevasse, chasm, abyss, etc.)', 'landmark:plant/tree', 'landmark:earth/rock', 'landmark:megalith/obelisk/statue', 'resource:game/hide/fur', 'resource:timber/clay/stone', 'resource:herb/spice/dye', 'resource:base mineral:(copper, tin, iron, quartz, amethyst, etc.)', 'resource:precious mineral:(silver, gold, diamond, etc.)', 'ruin:earthworks', 'ruin:bridge', 'ruin:mine/quary', 'ruin:bunkers', 'ruin:aqueduct/canal', 'ruin:graveyard/necropolis', 'ruin:barrow/tomb/crypt', 'ruin:shrine/temple', 'ruin:stadium', 'ruin:farm/estate/tower', 'ruin:prison', 'ruin:library/museum/school', 'ruin:stronghold/castle', 'ruin:town']

const Random = (o={})=>{
  let {seed=chance.natural()} = o
  let RNG = new Chance(seed)
  let t = RNG.weighted(['creature', 'hazard', 'obstacle', 'landmark', 'resource', 'ruin'], [30, 20, 20, 10, 10, 10])

  let res = RNG.pickone(featureTypes.filter(f=>f.split(":")[0] == t))

  return {
    t: featureTypes.indexOf(res)
  }
}

const Data = {
  "t": ["type", "select", featureTypes, 0, "number"],
  "x": ["px", "minmax", [0, 6000], 0, "number"],
  "y": ["py", "minmax", [0, 6000], 0, "number"]
}

//save / load state - collapse everything to an array 
const dataArray = ["t", "x", "y"]
const Save = (p)=>dataArray.map(id=>p[id] ? p[id].val : Data[id][3])
const Load = (d)=>Object.fromEntries(d.map((_d,i)=>[dataArray[i], _d]))

//create a blank feature 
const Blank = ()=>{
  return Object.fromEntries(Object.entries(Data).map(([key,d])=>[key, d[3]]))
}

const UI = (app)=>{
  const html = app.html

  //declare sub pieces for larger component
  const vid = "features"
  const changes = (hasDelta)=>hasDelta ? html`<div class="bg-orange br-100 mh2" style="width: 15px;height: 15px;"></div>` : ""
  const shortOwned = (f,hasDelta)=>html`<div class="flex"><span class="mh2">${featureTypes[f.t.val]}</span>[${f.x.val},${f.y.val}]${changes(hasDelta)}</div>`
  const short = (f)=>html`<div><span class="mh2">${featureTypes[f.t]}</span></div>`
  const format = Data

  //call the view 
  return app.views.realmFeature(app, {
    vid,
    format,
    short,
    shortOwned
  })
}

export {UI, Blank, Random as random, Save, Load}

//∆
