import*as state from '../state/index.js';

import*as data from './data.js';

/*
  feature : [name,typeid,px,py,area,tags]
*/

const DATA = {
  "featureCore": [
    ["type","select", data.featureTypes, 0, "number"],
    ["px", "minmax", [0, 1000], 0, "number"],
    ["py","minmax", [0, 1000], 0, "number"]
  ]
}

const ACTIONS = {
  "addFeature": {
    "name": "Add a New Feature",
    "about": "A feature is something unique - adventure worthy. Select the type and a point on the map.",
    "data" : DATA.featureCore,
    cost (payload) {
      let type = payload[0]
      let cost = 2
      
      if ([17,18,19].includes(type))
        cost = 4
      else if (type == 20)
        cost = 6
      else if (type == 21)
        cost = 10
      else if (type >= 22)
        cost = 25

      return cost
    },
  }
}

const setActions = (id,realm,appState)=>{
  let actions = {}

  let rf = state.features[id] || []
  //get state queue actions 
  let afq = appState.txQueue.reduce((sum,q)=>sum+(q.payload[0]=="addFeature"?1:0),0)
  //check if may add features 
  if (rf.length+afq < realm.attributes.features) {
    actions["addFeature"] = ACTIONS.addFeature
  }

  return actions
}

export {setActions}
