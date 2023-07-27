/*
  V0.3
*/

/*
  Chance RNG
*/
import "../lib/chance.min.js"
/*
  Storage
*/
//localforage
import "../lib/localforage.min.js"

/*
  Blockchain
*/
import {tokenData, submitEVMOSState, connect} from './blockchain.js';

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

    const byRealm = queue.reduce((bR,q,i)=>{
      if (!bR[q.name])
        bR[q.name] = {}

      bR[q.name][i] = q
      return bR
    }
    , {})

    return html`
        <div class="dropdown mh2">
          <a class="f6 link dim ba bw1 pa1 dib black" href="#0">Queue</a>
          <div class="dropdown-content">
            ${Object.entries(byRealm).map(([key,R])=>{
      return html`
              <div class="ba ma1">
                <div class="flex flex-inline items-center justify-between pa2">
                  <div>${key}</div>
                  <div class="dim pointer" onClick=${()=>app.submitQueue(key)}>[Submit ${Object.keys(R).length} <img src="../stars.png" width="12" height="12"></img>]</div>
                </div>
                ${Object.entries(R).map(([i,q])=>html`
                  <div class="flex flex-inline items-center justify-between pa2 ml2" style="width: 325px;">
                    <div>${q.what}</div>
                    <div class="dim pointer" onClick=${()=>rmQueue(Number(i))}>[✘]</div>
                  </div>
                `)}
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
        const {what, delta} = R.deltas(R, vid, id)

        //show owned data 
        const sub = html`
      <div class="flex justify-between items-center">
        <div class="b">#${id + 1}</div>
        <div>${shortOwned(what, delta)}</div>
        <div class="dim pa1 ba b--green pointer" onClick=${()=>app.setView(_vid + id)}>Edit</div>
      </div>`

        return id.toString() == _view[2] ? this.editFeature(app, R, vid, id, format) : baseDiv(sub)
      } else {
        //state only 
        const what = R.state[vid][id] || R.random[vid][id]
        //if undefinded vs data 
        return baseDiv(html`<div class="flex justify-between items-center"><div class="f4 b">#${id + 1}</div> ${!what ? `NOT SET` : short(what)}</div>`)
      }
    }

    return html`<div class="mh2">${ids.map(individual)}</div>`
  },
  editFeature(app, R, _what, id, format) {
    //universal editor for features/ruins/peoples 
    const _vid = ["realm", _what, id].join(".")
    const local = R[_what][id] || {}
    const {what, delta} = R.deltas(R, _what, id)

    //to bue sued by multiple calls to update state 
    const _update = (key,val,i=-1)=>{
      //establish array if it doesn't exist 
      if (i != -1 && !local[key]) {
        //set to random values first 
        local[key] = R.random[_what][id][key].slice()
      }
      //set value 
      if (i != -1) {
        local[key][i] = val
      } else {
        local[key] = val
      }

      //save local 
      R[_what][id] = local
      //save 
      R.save()
      app.setView(_vid)
    }

    //generate a new random value 
    const newRandom = (key,data,i=-1)=>{
      const random = data[0]
      const obj = {}
      //create object to send to random generator
      data.slice(1).forEach(([_id,_key])=>{
        obj[_id] = format[_key][1] == "select" ? format[_key][2][what[_key].val] : what[_key].val
      }
      )

      const nVal = key == "sites" ? random(obj) : random(obj)[key]
      _update(key, nVal, i)
    }

    //update payload with data information 
    const update = (e,key)=>{
      const val = format[key][4] == "number" ? Number(e.target.value) : e.target.value
      _update(key, val)
    }

    //check if in queue 
    const uid = [R.id, _what, id]
    const inQueue = app.state.txQueue.map(q=>q.uid.join(".")).indexOf(uid.join("."))
    //submit to queue 
    const submitDeltas = ()=>{
      let q = {
        name: R.name,
        what: _what + " " + (id + 1),
        uid
      }
      const push = ()=>{
        inQueue == -1 ? app.state.txQueue.push(q) : app.state.txQueue[inQueue] = q
        app.setView(_vid)
      }
      return html`<div class="b tc white dim mb1 pa1 br2 bg-green pointer" onClick=${push}>Submit Changes</div>`
    }

    //make an input based upon the data type 
    const makeDiv = {
      arr(key, d) {
        //get array info 
        const [base,nKey,div] = d[1].split(".")
        const n = what[nKey].val

        return html`<div>${Array.from({
          length: n
        }, (v,i)=>i).map(_i=>makeDiv[div](key, d, _i))}</div>`
      },
      seed(key, d, i=-1) {
        //pull value to randomly set and pull linked data 
        const val = i != -1 ? what[key].val[i] : what[key].val
        const linkUI = d[5]

        return html`
        <div class="flex items-center justify-between">
          ${linkUI(html, val)}
          <div class="b tc white dim pa1 ph3 br2 bg-green pointer" onClick=${()=>newRandom(key, d[2], i)}>↻</div>
        </div>
        `
      },
      random(key, d, i=-1) {
        const val = i != -1 ? what[key].val[i] : what[key].val
        return html`
        <div class="flex items-center mh1">
          <div class="mh2">${val || "null"}</div>
          <div class="b tc white dim mb1 pa1 ph3 br2 bg-green pointer" onClick=${()=>newRandom(key, d[2], i)}>↻</div>
        </div>`
      },
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
      ${Object.entries(format).map(([key,val])=>{
      const div = val[1].split(".")[0]
      if (div == "disabled")
        return

      return html`
        <div class="flex items-center ma1">
          <span class="b mh1">${val[0]}</span>${makeDiv[val[1].split(".")[0]](key, val)}
          <div class="${what[key].color} br-100" style="width: 15px;height: 15px;"></div>
        </div>`
    }
    )}
    </div>
    <div>${delta ? submitDeltas() : ""}</div>
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
      chain: -1,
      balance: 0,
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
    localStorage.setItem("lastLoad", Date.now())

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
  async setNetwork() {
    this.setState({
      tData: {},
      tokens: [],
      view: "main"
    })

    await connect(this)
  }

  async setEVMOS() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{
          chainId: '0x2329'
        }],
      });

      this.setNetwork()
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {// Do something
      }
    }
  }

  //submit queue for transaction 
  async submitQueue(key) {
    const {txQueue, realm, tData} = this.state

    //pull data from queue 
    const sent = []
      , q = [];
    txQueue.forEach((_q,i)=>{
      if (_q.name == key) {
        q.push(_q.uid)
        sent.push(i)
      }
    }
    )

    //format data 
    let data = tData[realm].toBlockchain(q)
    const tx = await submitEVMOSState(this, data)
    console.log(tx)
    //remove from q 
    sent.forEach(_i=>{
      txQueue.splice(_i, 1)
    }
    )
    this.setState({
      txQueue
    })
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
  render(props, {account, chain, balance, view, tokens, txQueue, showDialog, viewRealm}) {
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

    const connect = ()=>{
      if (chain == 9001 && balance > 0.11 && tokens.length > 0)
        return

      const lowBalance = html`<div class="br2 bg-yellow pointer tc ma1 pa1"><a href="https://app.osmosis.zone/?from=OSMO&to=EVMOS" target="_blank">Get EVMOS on Osmosis.</a></div>`
      const notConnect = html`<div class="br2 bg-red pointer dim white b tc ma1 pa1" onClick=${()=>this.setEVMOS()}>Please connect to EVMOS.</div>`
      return chain != 9001 ? notConnect : balance < 0.11 ? lowBalance : ""
    }

    return html`
      <div>
        <div class="relative flex items-center justify-between ph3 z-2">
          <div>
            <h1 class="mv2"><a class="link underline-hover black" href=".">Project 777</a></h1>
            <div>
              <span class="b">View #</span>
              <input class="tc" type="number" min="1" max="777" value=${viewRealm} onInput=${(e)=>viewRealm = Number(e.target.value)}></input>
              <a class="f6 link dim br2 br--right bw1 pa1 dib white bg-dark-green" href="#" onClick=${()=>this.setRealm(viewRealm)}>View</a>
              ${tokens.length > 0 ? myTokens() : ""}
            </div>
          </div>
          <div>
            <div class="flex items-center">
              ${txQueue.length > 0 ? Views.txQueue(this) : ""}
              <a class="f5 link dim ba bw1 pa1 dib black mh1" href="https://www.stargaze.zone/launchpad/stars1avmaqtmxw9g43mgpxzuhv074gmzm5wharxrvlsfp4ze7246gyqdqtr9a0l">Get A Realm</a>
              <a class="f5 link dim ba bw1 pa1 dib black mh1" href="#" onClick=${()=>this.setNetwork()}>${sortAdr}</a>
              <a class="f5 link dim ba bw1 pa1 dib black mh1" href="#" onClick=${()=>this.showDialog("isNew")}>About</a>
            </div>
            ${chain > -1 ? connect() : ""}
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

