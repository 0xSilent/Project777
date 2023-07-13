/*
  Storage
*/
//localforage
import "../lib/localforage.min.js"

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
import {RealmState, RealmUI, MyRealms} from "./realms.js"

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
      payload: []
    };

    //use in other views 
    this.html = html
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
    const cost = queue.reduce((sum,q)=>sum + q.cost, 0)
    //get payload 
    const payload = queue.map(q=>q.payload)
    console.log(cost, payload)
    //sendTx()
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
    const myTokens = () => {
      return html`
      <span>
        <span class="ml2 b">My Realms:</span> ${tokens.map(id=> html`<a class="white mh1" href="#" onClick=${()=>this.setRealm(id)}>${id}</a>`)}
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
          ${Views.dialog(this)}
          ${Views[_view](this)}
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
        <img src="https://nftstorage.link/ipfs/bafybeiec7wvovufcr5ul4edrghgjvlwmra52t7km5cex356pitddqnsvzy/1.jpeg" alt="Example Map" width="1000" height="1000"></img>
      </div>`
  },
  dialog(app) {
    let {showDialog} = app.state

    return showDialog == "" ? "" : html`<div class="absolute ma6 pa2 o-80 bg-washed-blue br3 shadow-5 z-2">${Views[showDialog](app)}</div>`
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

  },
  realm(app) {
    return RealmUI(app)
  },
  myRealms(app) {
    return MyRealms(app)
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

render(html`<${App}/>`, document.body);
