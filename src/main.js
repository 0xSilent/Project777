/*
  V0.3
*/

/*
  Storage
*/
//localforage
import "../lib/localforage.min.js"

/*
  Blockchain
*/
import {tokenData, submitChangeQueue, connect} from './blockchain.js';

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
import {RealmState, RealmUI} from "./realms.js"

const Views = {
  main(app) {
    return html`
        <div>
          <img src="https://nftstorage.link/ipfs/bafybeiec7wvovufcr5ul4edrghgjvlwmra52t7km5cex356pitddqnsvzy/1.jpeg" alt="Example Map" width="1000" height="1000"></img>
        </div>`
  },
  dialog(app) {
    let {showDialog} = app.state

    return showDialog == "" ? "" : html`<div class="absolute ma6 pa2 o-80 bg-washed-blue br3 shadow-5 z-2">${this[showDialog](app)}</div>`
  },
  txQueue(app) {
    let queue = app.state.txQueue

    const rmQueue = (i)=>{
      queue.splice(i, 1)
      app.setState({
        txQueue: queue.slice()
      })
    }

    //get total cost - simplified to number of changes being made 
    const cost = queue.length

    return html`
        <div class="dropdown mh2">
          <a class="f6 link dim ba bw1 pa1 dib black" href="#0" onClick=${()=>app.submitQueue()}>Queue [${queue.length} : ${cost} <img src="../stars.png" width="12" height="12"></img>]</a>
          <div class="dropdown-content">
            <div class="dim pa2 pointer" onClick=${()=>app.submitQueue()}>Submit</div>
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
  realm(app) {
    //main realm display 
    return RealmUI(app)
  },
  realmFeature(app, {vid, format, short, shortOwned}) {
    //sub display for features/ruins/peoples 
    //get state and realm 
    const {tokens, realm, tData, view, qBlock} = app.state
    const R = tData[realm]
    //vid 
    const _vid = "realm." + vid + "."
    //create array for loop 
    const ids = Array.from({
      length: R.attributes[vid]
    }, (v,i)=>i);
    //determine view and look for feature id 
    const _view = view.split(".")

    //base encapsulating div for feature 
    const baseDiv = (sub)=>{
      return html`<div class="ma1 pa1 ph3 ba">${sub}</div>`
    }

    //show individual feature/ruins/people   
    let individual = (id)=>{
      //display edit if owned and selected   
      if (tokens.includes(R.id)) {
        //current feature
        const {what, delta} = R.deltas(R, qBlock, vid, id)

        //show owned data 
        const sub = html`
      <div class="flex justify-between items-center">
        <div class="b">#${id + 1}</div>
        <div>${shortOwned(what, delta.length != 0)}</div>
        <div class="dim pa1 ba b--green pointer" onClick=${()=>app.setView(_vid + id)}>Edit</div>
      </div>`

        return id.toString() == _view[2] ? this.editFeature(app, R, vid, id, format) : baseDiv(sub)
      } else {
        //state only 
        const what = R.state[vid][id]
        //if undefinded vs data 
        return baseDiv(html`<div class="flex justify-between items-center"><div class="f4 b">#${id + 1}</div> ${!what ? `NOT SET` : short(what)}</div>`)
      }
    }

    return html`<div class="mh2">${ids.map(individual)}</div>`
  },
  editFeature(app, R, _what, id, format) {
    //universal editor for features/ruins/peoples 
    const _vid = ["realm",_what,id].join(".")
    const local = R[_what][id] || {}
    const {what, delta} = R.deltas(R, app.state.qBlock, _what, id)
    
    //update payload with data information 
    const update = (e,key)=>{
      //update feature 
      local[key] = format[key].input[4] == "number" ? Number(e.target.value) : e.target.value
      R[_what][id] = local
      //save 
      R.save()
      app.setView(_vid)
    }

    //check if in queue 
    const uid = [R.id,_what.charAt(0).toLowerCase(),id]
    const inQueue = app.state.txQueue.map(q=>q.payload.slice(0, 3).join(".")).indexOf(uid.join("."))
    //submit to queue 
    const submitDeltas = ()=>{
      let q = {
        name: R.name,
        what: _what + " " + (id + 1),
        cost: delta.length,
        payload: [...uid, ...delta]
      }
      const push = ()=>{
        inQueue == -1 ? app.state.txQueue.push(q) : app.state.txQueue[inQueue] = q
        app.setView(_vid)
      }
      return html`<div class="b tc white dim mb1 pa1 br2 bg-green pointer" onClick=${push}>Submit Changes</div>`
    }

    //make an input based upon the data type 
    const makeDiv = {
      select(key, d) {
        return html`
        <select class="mv1" value=${what[key].val} onChange=${(e)=>update(e, key)}>
          ${d[2].map((val,j)=>html`<option value=${j}>${val}</option>`)}
        </select>
        `
      },
      minmax(key, d) {
        return html`<input type="number" min=${d[2][0]} max=${d[2][1]} value=${what[key].val} onInput=${(e)=>update(e, key)}></input>`
      }
    }

    //provide a form to input data 
    return html`
  <div class="ba ma1 ph2">
    <h3 class="ma0">#${id + 1}</h3>
    <div class="flex flex-wrap items-center justify-around">
      ${Object.entries(format).map(([key,val])=>html`
        <div class="flex items-center ma1">
          <span class="b mh1">${val.input[0]}</span>${makeDiv[val.input[1]](key, val.input)}
          <div class="${what[key].color} br-100" style="width: 15px;height: 15px;"></div>
        </div>`)}
    </div>
    <div>${delta.length > 0 ? submitDeltas() : ""}</div>
  </div>`
  },
  isNew(app) {
    return html`
        <div>
          <h2 class="ma0 i">Deep in the 'Verse...</h2>
          <p class="i">A ringworld spins around a standard yellow-orange star. 
          Not a titanic ringworld that encircles the whole star, but a more mundane one. 
          It is comprised of 777 plates each 6000 km wide and long. It only has a dameter of 1.48 million kilometers, 
          but it has an area equivalent to 55 Earths. 
          </p>
          <p class="i">It is maintained (ruled) by the Seven, a group of cosmically powered AIs, 
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
          <div class="mh6">
            <a class="tc f6 link dim dib pv2 br2 white bg-dark-green w-100" href="https://www.stargaze.zone/launchpad/stars1avmaqtmxw9g43mgpxzuhv074gmzm5wharxrvlsfp4ze7246gyqdqtr9a0l">Get a Realm on Stargaze</a>
          </div>
        </div>
        `
  }
}

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
      viewRealm: 1,
      testnet: false,
      jsonQueue: [],
      txQueue: [],
      qBlock: []
    };

    //use in other views 
    this.html = html
    this.views = Views
  }

  // Lifecycle: Called whenever our component is created
  async componentDidMount() {
    //check if freash load - display about
    let lastLoad = localStorage.getItem("lastLoad")
    if (lastLoad === null) {
      this.showDialog("isNew")
    }
    this.save("lastLoad", Date.now())

    //find out if searching for a particular realm 
    const url = new URL(window.location.href);
    const params = url.searchParams;
    if (params.get("token_id")) {
      let _id = params.get("token_id").slice(-8)
      this.setRealm(_id)
    }
  }

  // Lifecycle: Called just before our component will be destroyed
  componentWillUnmount() {}

  //save local state 
  async save(key, what, where="browser") {
    if (where == "browser") {
      localStorage.setItem(key, what)
    } else if (where == "storage") {
      DB.setItem(key, what)
    }
  }

  //load local state 
  async load(key, where="browser") {
    if (where == "browser") {
      return localStorage.getItem(key)
    } else if (where == "storage") {
      return await DB.getItem(key)
    }
  }

  //show the dialog calling which dialog to show 
  showDialog(what) {
    this.setState({
      showDialog: what
    })
  }

  setView(view) {
    this.setState({
      view
    })
  }

  //set Stargaze network 
  async setNetwork(isMain=true) {
    this.setState({
      testnet: !isMain,
      tData: {},
      tokens: [],
      view: "main"
    })

    connect(this, isMain)
  }

  //submit queue for transaction 
  submitQueue() {
    let queue = this.state.txQueue
    //get total cost 
    const cost = queue.length
    //get payload 
    const payload = queue.map(q=>q.payload)
    submitChangeQueue(this, cost, payload)
  }

  //load a token 
  async loadToken(id) {
    let {tData, testnet, jsonQueue} = this.state

    //check if data exists
    if (!Object.keys(tData).includes(id) || tData[id] === undefined) {
      if (!jsonQueue.includes(id)) {
        this.state.jsonQueue.push(id)
      }

      //if data doesn't exist pull it 
      tData[id] = await tokenData(id, !testnet)
      //get state data 
      await RealmState(tData[id])

      this.setState({
        tData
      })

      //update queue
      jsonQueue.splice(jsonQueue.indexOf(id))
      this.setState({
        jsonQueue
      })

      //pull 
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

  //main page render 
  render(props, {account, view, tokens, txQueue, showDialog, testnet, viewRealm}) {
    const sortAdr = account.length > 0 ? account.slice(0, 5) + "..." + account.slice(-4) : "Connect"

    //get view as array 
    let _view = view.split(".")[0]

    //view a list of owned tokens
    const myTokens = ()=>{
      return html`
      <span>
        <span class="ml2 b">My Realms:</span> ${tokens.map(id=>html`<a class="white mh1" href="#" onClick=${()=>this.setRealm(id)}>${id}</a>`)}
      </span>`
    }

    return html`
      <div>
        <div class="relative flex items-center justify-between ph3 z-2">
          <div>
            <h1 class="mv2"><a class="link underline-hover black" href=".">Project 777</a></h1>
            <div>
              <span class="b">View #</span>
              <input class="tc" type="number" min="1" max=${testnet ? 3 : 777} value=${viewRealm} onInput=${(e)=>viewRealm = Number(e.target.value)}></input>
              <a class="f6 link dim br2 br--right bw1 pa1 dib white bg-dark-green" href="#" onClick=${()=>this.setRealm(viewRealm)}>View</a>
              ${tokens.length > 0 ? myTokens() : ""}
            </div>
          </div>
          <div class="flex items-center">
            ${txQueue.length > 0 ? Views.txQueue(this) : ""}
            <a class="f5 link dim ba bw1 pa1 dib black" href="https://www.stargaze.zone/launchpad/stars1avmaqtmxw9g43mgpxzuhv074gmzm5wharxrvlsfp4ze7246gyqdqtr9a0l">Get A Realm</a>
            <div class="dropdown ml2">
              <a class="f5 link dim ba bw1 pa1 dib black" href="#" onClick=${()=>this.setNetwork()}>${sortAdr}</a>
              <div class="dropdown-content">
                <a href="#" onClick=${()=>this.setNetwork(false)}>Testnet</a>
              </div>
            </div>
            <a class="ml2 f5 link dim ba bw1 pa1 dib black" href="#" onClick=${()=>this.showDialog("isNew")}>About</a>
          </div>
        </div>
        <div class="flex justify-center w-100 z-0">
          ${this.views.dialog(this)}
          ${this.views[_view](this)}
        </div>
      </div>
      `
  }
}

render(html`<${App}/>`, document.body);
