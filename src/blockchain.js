import {NFTState} from "./abi.js";
import {ethers} from "../lib/ethers-5.7.esm.min.js";
const EVMOSView = new ethers.providers.JsonRpcProvider("https://evmos-json-rpc.stakely.io");
let EVMOSSigner;
// evmos deploy 
const Contracts = {
  "NFTState" : new ethers.Contract("0x6bE37751e38FD34638749eC3c5a69F1B1F4377C9", NFTState, EVMOSView)
}

/*
  Handle JSON queries 
*/
const getJSON = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    //xhr.addEventListener("error", console.log);
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

/*
  Connection to Stargaze 
  Using webpack cosmjs 
*/
import '../lib/cosmjs-stargate.min.js';
const {SigningStargateClient, StargateClient, CosmWasmClient, Tx} = cosmjs
const chainId = "stargaze-1";
const dev777 = "stars1wf83cereqynr93rktsvey8d829352radh2p3us";
let client, cwclient;

//State 
const lastState = "https://nftstorage.link/ipfs/bafybeid7urfh623nyp343whxb6pm5znu7zyo4xf7jiyvhkhegyfkx37l7e/"

//basic function to pull tx that are to/from an account
const getTxToOrFrom = async(address,ToOrFrom="from")=>{
  const search = await client.searchTx({
    sentFromOrTo: address
  }, {
    minHeight: 9179451,
  })
  let res = []

  //use for each to reduce cycle time through 
  search.forEach(({hash, height, rawLog, tx})=>{
    const events = JSON.parse(rawLog)[0].events
    //reduce the events looking for a transfer 
    const {sender, recipient, amount} = events.reduce((_tfr,e)=>{
      if (_tfr.sender != "" || e.type != "transfer")
        return _tfr;

      //map attributes.value [sender address, recipient address, # stars] to _tfr 
      e.attributes.forEach(a=>_tfr[a.key] = a.value)
      return _tfr
    }
    , {
      sender: "",
      recipient: "",
      amount: 0
    })
    //check for amt and address and recipient is 777 
    if (amount == 0 || address != (ToOrFrom == "from" ? sender : recipient) || recipient != dev777)
      return;

    //decode raw tx
    const decoded = Tx.decode(tx)

    let data = {
      hash,
      height,
      sender,
      recipient,
      amount,
      memo: JSON.parse(decoded.body.memo)
    }

    res.push(data)
  }
  )

  return res
}

const submitEVMOSState = async (app,data)=>{
  //base cost 
  const base = await Contracts.NFTState.cost()
  const overrides = {
    value : base
  }

  //submit tx 
  return await Contracts.NFTState.connect(EVMOSSigner).setState(...data,overrides)
}


/*
  Query Data
*/

const getTokensByAddress = async(address,isMain=true)=>{
  const main = "stars19vgvlu5jw4ne2aang6fnwg8ul8wlqcdmht3h2m87rtqel3ztgxcqsh0aa3"
  const test = "stars1gdf8ud465e9khy590fmtxcywxcydwzec5ecf84gc7vcgytphla3qlntuhc"

  const query = {
    tokens: {
      owner: address
    }
  }

  return await cwclient.queryContractSmart(isMain ? main : test, query)
}

//testnet / mainnet 
const NFT = {
  count: [3, 777],
  img: ["https://bafybeiatxfo52ynuvrsezfztphdqfj3bnnjrxxf75jzbeija5cmyux64im.ipfs.nftstorage.link/", "https://nftstorage.link/ipfs/bafybeiec7wvovufcr5ul4edrghgjvlwmra52t7km5cex356pitddqnsvzy/"],
  json: ["https://bafybeid2k2e5qn3rydmaa4af3n5iqbtfm4iosfe35hddcvviw5sujsrl2m.ipfs.nftstorage.link/", "https://nftstorage.link/ipfs/bafybeidi5sdbptoo7ltq3zxqg3rkqzyqzful6rzsmnfmlw7mpm43y6kw34/"]
}

/*
  Pull token data from IPFS state 
*/
const tokenData = async(id,isMain)=>{
  let idx = isMain ? 1 : 0

  let data = await getJSON(NFT.json[idx] + id)
  data.image = NFT.img[idx] + id + ".jpeg"

  const attr = Object.fromEntries(data.attributes.map(a=>[a.trait_type, a.value]))
  data.attributes = attr

  //need full count of values for state 
  let n = attr.features+attr.people+attr.ruins
  //pull state from evmos
  const _state = await Contracts.NFTState.getState(Number(id),Array.from({length:n},(v,i)=>i))
  data._state = _state.map(val => {
    const d = LZString.decompressFromUTF16(val)
    return d ? JSON.parse(d) : null
  })

  return data
}

const EVMOSConnect = async(app)=>{ 
  // A Web3Provider wraps a standard Web3 provider, which is
  // what MetaMask injects as window.ethereum into each page
  const provider = new ethers.providers.Web3Provider(window.ethereum)

  // MetaMask requires requesting permission to connect users accounts
  await provider.send("eth_requestAccounts", []);

  // The MetaMask plugin also allows signing transactions to
  // send ether and pay to change state within the blockchain.
  // For this, you need the account signer...
  const signer = EVMOSSigner = provider.getSigner()
  const address = await signer.getAddress()

  const chain = await signer.getChainId()
  const balance = ethers.utils.formatEther(await signer.getBalance())
  app.setState({chain,balance})

  //set for change 
  window.ethereum.on('accountsChanged', function (accounts) {
    // Time to reload your interface with accounts[0]!
    EVMOSConnect(app)
  })
}

const connect = async(app,isMain=true)=>{
  //connect with evmos via metamask 
  EVMOSConnect(app)
  
  const main = "https://rpc.stargaze-apis.com/"
  const test = "https://rpc.elgafar-1.stargaze-apis.com"
  //connect to Stargaze 
  client = await StargateClient.connect(isMain ? main : test)
  cwclient = await CosmWasmClient.connect(isMain ? main : test)

  //chain id 
  const chainId = await cwclient.getChainId()
  console.log("Chain: ", chainId, await cwclient.getHeight())

  //connect to keplr
  await window.keplr.enable(chainId);
  const offlineSigner = window.keplr.getOfflineSigner(chainId);
  const accounts = await offlineSigner.getAccounts();

  //address 
  app.setState({
    account: accounts[0].address
  });

  //get tx in submit queue 
  let qTX = await getTxToOrFrom(accounts[0].address)
  app.state.qBlock.push(...qTX.map(tx=>tx.memo).flat())

  //tokens 
  let tokens = await getTokensByAddress(accounts[0].address, isMain)
  app.setState({
    tokens: tokens.tokens
  })

  const tData = app.state.tData
  tokens.tokens.forEach(async id=>app.loadToken(id))
}

export {tokenData, submitEVMOSState, connect}
