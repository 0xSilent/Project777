/*
  Blockchain
*/
import {tokenData, sendTx, connect} from './blockchain.js';

/*
  UI Resources  
*/
//Preact
import {h, Component, render} from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';
// Initialize htm with Preact
const html = htm.bind(h);

/*
  DATA
*/

//import XYZ from "./abc.js"

/*
  Declare the main App 
*/

import {setActions} from './actions.js';

class App extends Component {
  constructor() {
    super();
    this.state = {
      view: "main",
      showDialog: "",
      account: "",
      tokens: [],
      tData: {},
      realm: 1,
      startAt: 1,
      testnet: true,
      jsonQueue: [],
      txQueue: [],
      payload: []
    };
  }

  // Lifecycle: Called whenever our component is created
  async componentDidMount() {
    this.setState({
      realm: await this.loadToken(1)
    })

    //check if freash load - display about
    let lastLoad = localStorage.getItem("lastLoad")
    if (lastLoad === null) {
      this.showDialog("isNew")
    }
    this.save("lastLoad", Date.now())
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {}

  //save local state 
  async save(key, what, where="browser") {
    if (where == "browser") {
      localStorage.setItem(key, what)
    }
  }

  showDialog(what) {
    this.setState({
      showDialog: what
    })
  }

  async setNetwork(isMain=true) {
    this.setState({
      testnet: !isMain,
      tData: {},
      tokens: [],
      view: "main"
    })

    this.setState({
      realm: await this.loadToken(1)
    })

    connect(this, isMain)
  }

  //submit queue for transaction 
  submitQueue() {
    let queue = this.state.txQueue
    //get total cost 
    const cost = queue.reduce((sum,q)=>sum + q.cost, 0)
    //get payload 
    const payload = queue.map(q=>q.payload)
    console.log(cost, payload)
    //sendTx()
  }

  async loadToken(id) {
    let {tData, testnet, jsonQueue} = this.state

    //check if data exists
    if (!Object.keys(tData).includes(id) || tData[id] === undefined) {
      if (jsonQueue.includes(id))
        return
      this.state.jsonQueue.push(id)

      //if data doesn't exist pull it 
      tData[id] = await tokenData(id, !testnet)
      this.setState({
        tData
      })

      //update queue
      jsonQueue.splice(jsonQueue.indexOf(id))
      this.setState({
        jsonQueue
      })
    }
    return tData[id]
  }

  //set token to display 
  async setRealm(id) {
    await this.loadToken(id)
    this.setState({
      realm: id,
      view: "realm",
      payload: []
    })
    console.log(this.state.tData[id])
  }

  render(props, {account, view, txQueue, showDialog}) {
    const sortAdr = account.length > 0 ? account.slice(0, 5) + "..." + account.slice(-4) : "Connect"

    return html`
      <div>
        <div class="relative flex items-center justify-between pa2 z-2">
          <h1>Project 777</h1>
          <div class="flex items-center">
            ${txQueue.length > 0 ? Views.txQueue(this) : ""}
            <a class="f6 link dim ba bw1 pa1 dib black" href="#0" onClick=${()=>this.setNetwork()}>${sortAdr}</a>
            <div class="dropdown ml2">
              <a class="f6 link dim ba bw1 pa1 dib black" href="#0"><img src="md-menu.svg" width="20" height="20"></img></a>
              <div class="dropdown-content">
                <a href="#" onClick=${()=>this.setState({
      view: "allRealms"
    })}>View Realms</a>
                <a href="#" onClick=${()=>this.showDialog("isNew")}>About</a>
                <a href="#" onClick=${()=>this.setNetwork(false)}>Testnet</a>                
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-center absolute top-0 w-100 z-0">
          ${Views.dialog(this)}
          ${Views[view](this)}
        </div>
      </div>
      `
  }
}

//testnet / mainnet 
const Views = {
  main(app) {
    return html`
      <div>
        <img src=${app.state.realm.image} alt="Example Map" width="1000" height="1000"></img>
      </div>`
  },
  dialog(app) {
    let {showDialog} = app.state

    return showDialog == "" ? "" : html`<div class="absolute ma6 pa2 o-80 bg-washed-blue br3 shadow-5">${Views[showDialog](app)}</div>`
  },
  txQueue(app) {
    let queue = app.state.txQueue

    const rmQueue = (i)=>{
      queue.splice(i, 1)
      app.setState({
        txQueue: queue.slice()
      })
    }

    //get total cost 
    const cost = queue.reduce((sum,q)=>sum + q.cost, 0)

    return html`
    <div class="dropdown mh2">
      <a class="f6 link dim ba bw1 pa1 dib black" href="#0">Queue [${queue.length} : ${cost} stars]</a>
      <div class="dropdown-content">
        <div class="dim pa2 pointer">Submit</div>
        ${queue.map((q,i)=>{
      return html`
          <div class="flex flex-inline items-center justify-between dim pa2 pointer" style="width: 275px;" onClick=${()=>rmQueue(i)}>
            <div>${q.name} - ${q.what}</div>
            <div>✘</div>
          </div>`
    }
    )}
      </div>
    </div>
    `
  },
  actions(app) {
    let {tokens, realm, tData, payload} = app.state
    const R = tData[realm]
    //get available actions 
    const act = setActions(realm, R, app.state)

    //change action changes payload 
    const changeAction = (_a)=>{
      let _act = act[_a]
      let _p = _act.data.map(d=>d[3])
      payload = [_a, _act.cost(_p), _p]
    }
    //update payload with data information 
    const updatePayload = (e,i)=>{
      let _act = act[payload[0]]
      payload[2][i] = _act.data[i][4] == "number" ? Number(e.target.value) : e.target.value
      payload[1] = _act.cost(payload[2])

      app.setState({
        payload: payload.slice()
      })
      console.log(app.state.payload)
    }
    //push to tx queue 
    const txQueue = ()=>{
      let data = {
        name: R.name,
        what: _act.name,
        cost: app.state.payload[1],
        payload: app.state.payload
      }

      app.state.txQueue.push(data)
      //clear payload 
      payload = []
      app.setState({
        payload: []
      })
    }

    //make an input based upon the data type 
    const makeDiv = {
      select(d, i) {
        return html`
        <select class="mv1" value=${payload[2][i]} onChange=${(e)=>updatePayload(e, i)}>
          ${d[2].map((val,j)=>html`<option value=${j}>${val}</option>`)}
        </select>
        `
      },
      minmax(d, i) {
        return html`<input type="number" min=${d[2][0]} max=${d[2][1]} value=${payload[2][i]} onInput=${(e)=>updatePayload(e, i)}></input>`
      }
    }

    //set action if none current 
    if (payload.length == 0) {
      changeAction(Object.keys(act)[0])
    }
    let _act = act[payload[0]]

    return html`
    <div class="pa1 ba w-100">
      <h3 class="ma0">Take an Action</h3>
      <select class="mv1 w-100" value=${payload[0]} onChange=${(e)=>changeAction(e.target.value)}>
        ${Object.entries(act).map(([key,action])=>html`<option value=${key}>${action.name}</option>`)}
      </select>
      <div>${_act.about}</div>
      <div class="flex flex-inline items-center justify-around">
        ${_act.data.map((d,i)=>html`<div class="ma1"><span class="b">${d[0]}</span> ${makeDiv[d[1]](d, i)}</div>`)}
      </div>
      <a class="db link dim br2 pointer pa1 bg-dark-green white tc w-100" onClick=${()=>txQueue()}>Queue (Cost: ${app.state.payload[1]} stars)</a>
    </div>
    `
  },
  featureMarker(app) {
    return html`<div class="feature-marker">➤</div>`
  },
  realm(app) {
    const {tokens, realm, tData} = app.state
    const R = tData[realm]

    const adiv = (id)=>html`<div class="ma1 pa1 ba" style="width: 175px;">${id}: ${R.attributes[id.toLowerCase()]}</div>`

    return html`
      <div class="w-90 mv5 ph2">
        <h2 onClick=${()=>this.setState({
      view: "realm"
    })}>${R.name} ${tokens.includes(realm) ? " [Owned]" : ""}</h2>
        <div class="flex">
          <div class="pa2">
            <div class="flex flex-wrap f4">${["Order", "Heightmap", "Seed", "Latitude", "Temperature", "Precipitation", "People", "Features", "Ruins"].map(adiv)}</div>
          </div>
          <div style="min-width: 800px;min-height: 800px;"> 
            <div class="absolute">
              <img id="map" src=${R.image} width="800" height="800"></img>
            </div>
          </div>
        </div>
      </div>
    `
  },
  smallRealm(app, id) {
    let {name, image} = app.state.tData[id]

    return html`
    <div class="link ma1 pa2 dim ba bw1 dib black" onClick=${()=>app.setRealm(id)}>
      <div class="tc">${name}</div>
      <img src=${image} width="100" height="100"></img>
    </div>
    `
  },
  myRealms(app) {
    const {tokens, tData} = app.state
    if (tokens.length == 0)
      return

    return html`
      <div>
        <h2>My Realms</h2>
        <div class="flex">
          ${tokens.map(id=>this.smallRealm(app, id))}
        </div>
      </div>
    `
  },
  allRealms(app) {
    const count = [3, 777]
    const {startAt, tData, testnet} = app.state
    const max = count[testnet ? 0 : 1]
    const ids = Array.from({
      length: startAt + 9 > max ? max : 10
    }, (v,i)=>startAt + i);

    return html`
      <div class="w-90 mv5 ph2">
        ${this.myRealms(app)}
        <h2>All Realms</h2>
        <form>
          
        </form>
        <div class="flex">
          ${ids.map(id=>tData[id] ? this.smallRealm(app, id) : app.loadToken(id))}
        </div>
      </div>
    `
  },
  isNew(app) {
    return html`
    <div>
      <h2 class="ma0 i">Deep in the 'Verse...</h2>
      <p class="i">A ringworld spins around a standard yellow-orange star. 
      Not a titanic, ringworld that encircles the whole star, but a more mundane one. 
      It is comprised of 777 plates each 6000 km wide and long. It only has a dameter of 1.48 million kilometers, 
      but it has an area equivalent to 55 Earths. 
      </p>
      <p class="i">It is maintained (ruled) by the Seven, a group ofcosmically powered AIs, 
      that initially seeded the ring with life so that they could play as gods. 
      Unfortunately their first experiment didn't end well. The Cataclysm left most plates devoid of life, 
      but the Seven have decided to try again. 
      </p>
      <p class="i">You are one of their proxies, given dominion over one (or a number) of plates. 
      While the land is established, the rest is your canvas - you will shape its features, creatures, people and it's future. 
      </p>
      <div class="mh6">
        <a class="tc f6 link dim dib pv2 br2 white bg-dark-green w-100" href="#0" onClick=${()=>app.showDialog("")}>Continue</a>
      </div>
      <p class="tc">The goal of this project is to create the most interesting fantasy world that you can. 
      There is no PvP, focus on creative world building. 
      </p>
    </div>
    `
  }
}

render(html`<${App}/>`, document.body);
