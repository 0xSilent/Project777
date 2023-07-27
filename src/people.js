const chance = new Chance()

const forms = ['humanoid', 'animal', 'artificial', 'alien']
const airAnimals = ['pteranadon', 'condor', 'eagle/owl', 'hawk/falcon', 'crow/raven', 'heron/crane/stork', 'gull/waterbird', 'songbird/parrot','chicken/duck/goose','bee/hornet/wasp','locust/dragonfly/moth','gnat/mosquito/firefly']
const earthAnimals = ['dinosaur/megafauna','elephant/mammoth','ox/rhinoceros','bear/ape/gorilla','deer/horse/camel','cat/lion/panther','dog/wolf/boar/pig','snake/lizard/armadillo','mouse/rat/weasel','ant/centipede/scorpion','snail/slug/worm','termite/tick/louse']
const waterAnimals = ['whale/narwhal','squid/octopus','dolphin/shark','alligator/crocodile','turtle','shrimp/crab/lobster','fish','frog/toad','eel/snake','clam/oyster/snail','jelly/anemone','insect/barnacle']
const oddities = ['many-heads/no-head','profuse sensory organs','many limbs/tentacles/feelers','shape changing','bright/garish/harsh','web/network','crystalline/glassy','gaseous/misty/illusory','volcanic/explosive','magnetic/repellant','multilevel/tiered','absurd/impossible']
const elements = ['void','death/darkness','fire/metal/smoke','earth/stone','plants/fungus','water/ice/mist','air/wind/storm','stars/cosmos']
const magicTypes = ['necromancy','evocation/destruction','conjuration/summoning','illusion/glamor','enchantment/artifice','transformation','warding/binding','restoration/healing','divination/scrying']

const Random = {
  size (RNG=chance, what) {
    const p = [20,30,10,25][what]
    return RNG.bool({ likelihood: p }) ? RNG.pickone([".small",".large"]) : ""
  },
  humanoid(RNG=chance) { 
    const cur = RNG.weighted(['c', 'u', 'r'], [6, 4, 2])
    let res = ''
    
    if(cur == 'c')
      res = RNG.weighted(['human', 'human.minorFeature'], [6,6])
    else if (cur == 'u')
      res = RNG.weighted(['human.animal', 'human.majorFeature','human.vegetation'], [4,4,4])
    else 
      res = RNG.weighted(['cyborg', 'hologram', 'human.element'], [6,2,4])

    res += Random.size(RNG,0)

    return res.split(".").map(r => Random[r] ? Random[r](RNG) : r).join(".")
  },
  _animal(RNG=chance,aew = '') {
    if(aew == '')
      aew = RNG.weighted(['a', 'e', 'w'], [3,6,2])
    
    if (aew == 'a')
      return RNG.pickone(RNG.pickone(airAnimals).split("/"))
    else if (aew == 'e')
      return RNG.pickone(RNG.pickone(earthAnimals).split("/"))
    else if (aew == 'w')
      return RNG.pickone(RNG.pickone(waterAnimals).split("/"))
  },
  chimera(RNG=chance) {
    return ['chimera' + Random.size(RNG,1),Random._animal(RNG,RNG.weighted(['a', 'e', 'w'], [3,6,2])),Random._animal(RNG,RNG.weighted(['a', 'e', 'w'], [3,6,2]))].join(".")
  },
  animal(RNG=chance) { 
    const aew = RNG.weighted(['a', 'e', 'w', 'c'], [3,6,2,1])

    return aew == 'c' ? Random.chimera(RNG) : ['animal'+ Random.size(RNG,1),Random._animal(RNG,aew)].join(".")
  },
  artificial(RNG=chance) {
    const cur = RNG.weighted(['c', 'u', 'r'], [6, 4, 2])
    let res = ''

    if(cur == 'c')
      res = RNG.weighted(['humanoid', 'geometric'], [6, 6])
    else if (cur == 'u')
      res = RNG.weighted(['animal', 'hologram'], [8, 4])
    else 
      res = RNG.weighted(['cloud', 'humanoid.element', 'geometric.element', 'animal.element'], [3,3,3,3])

    return ['artificial'+Random.size(RNG,2),...res.split(".").map(r => Random[r] && r != 'humanoid' ? Random[r](RNG) : r)].join(".") 
  },
  alien(RNG=chance) {
    const cur = RNG.weighted(['c', 'u', 'r'], [6, 4, 2])
    let res = ''

    if(cur == 'c')
      res = RNG.weighted(['vegetation.animal', 'animal.oddity'], [6,6])
    else if (cur == 'u')
      res = RNG.weighted(['slime', 'geometric.oddity', 'animal.element'], [4,4,4])
    else
      res = 'geometric.element.oddity'

    return ['alien'+Random.size(RNG,3),...res.split(".").map(r => Random[r] ? Random[r](RNG) : r)].join(".")
  },
  oddity(RNG=chance) {
    return RNG.pickone(RNG.pickone(oddities).split("/"))
  },
  element (RNG=chance) {
    return "element."+RNG.pickone(RNG.weighted(elements,[1,1,2,2,1,2,2,1]).split("/"))
  },
  random (o = {}) {
    let {seed = chance.natural(), f} = o 
    let RNG = new Chance(seed)
    f = f === undefined ? RNG.weighted(forms, [5, 4, 3, 1]) : f
    
    return {f:Random[f](RNG)}
  } 
}

const Data = {
  "fi": ["form", "select", forms, 0, "number"],
  "f" : ["form", "random", [Random.random,["f","fi"]], "string"]
}

//save / load state - collapse everything to an array 
const dataArray = ["fi","f"]
const Save = (p)=>dataArray.map(id=>p[id] ? p[id].val : Data[id][3])
const Load = (d)=>Object.fromEntries(d.map((_d,i)=>[dataArray[i], _d]))

//create a blank feature 
const Blank = ()=>{
  return Object.fromEntries(Object.entries(Data).map(([key,d])=>[key, d[3]]))
}

const UI = (app)=>{
  const html = app.html

  //declare sub pieces for larger component
  const vid = "people"
  const changes = (hasDelta)=>hasDelta ? html`<div class="bg-orange br-100 mh2" style="width: 15px;height: 15px;"></div>` : ""
  const shortOwned = (w,hasDelta)=>html`<div class="flex">${w.f.val}${changes(hasDelta)}</div>`
  const short = (w)=>html`<div>${w.f}</div>`
  const format = Data

  //call the view 
  return app.views.realmFeature(app, {
    vid,
    format,
    short,
    shortOwned,
  })
}

const random = Random.random 
export {UI, random, Blank, Save, Load}
