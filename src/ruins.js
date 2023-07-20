const Data = {
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
  return Object.fromEntries(Object.entries(Data).map(([key,d])=>[key, d.input[3]]))
}

const UI = (app)=>{
  const html = app.html

  //declare sub pieces for larger component
  const vid = "ruins"
  const changes = (hasDelta)=>hasDelta ? html`<div class="bg-orange br-100 mh2" style="width: 15px;height: 15px;"></div>` : ""
  const shortOwned = (f,hasDelta)=>html`<div class="flex">[${f.x.val},${f.y.val}]${changes(hasDelta)}</div>`
  const short = (f)=>html`<div>[${f.x},${f.y}]</div>`
  const format = Data

  //call the view 
  return app.views.realmFeature(app,{vid,format,short,shortOwned})
}

export {UI as RuinUI, Blank as bRuin}