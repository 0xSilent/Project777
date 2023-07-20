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
  },{
    minHeight : 9179451,
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

const submitChangeQueue = (app,cost,payload)=>{
  //777 dev 
  let recipient = dev777;

  let amount = parseFloat(cost);
  if (isNaN(amount)) {
    alert("Invalid amount");
    return false;
  }

  amount *= 1000000;
  amount = Math.floor(amount);

  //payload 
  const memo = JSON.stringify(payload);

  (async()=>{
    //get account and signer 
    await window.keplr.enable(chainId);
    const offlineSigner = window.keplr.getOfflineSigner(chainId);
    const accounts = await offlineSigner.getAccounts();

    //set client 
    const client = await SigningStargateClient.connectWithSigner("https://rpc.stargaze-apis.com/", offlineSigner);

    //get cost and fee 
    const amountFinal = {
      denom: "ustars",
      amount: amount.toString(),
    };
    const fee = {
      amount: [{
        denom: "ustars",
        amount: "5000",
      }, ],
      gas: "200000",
    };

    //send 
    client.sendTokens(accounts[0].address, recipient, [amountFinal], fee, memo).then(res=>{
      console.log(res)
      //cleare queue 
      app.setState({txQueue:[]})
    }
    ).catch(res=>{
      console.log("Rejected")
    }
    )

    //assertIsBroadcastTxSuccess(result);
  }
  )();

  return false;
}
;

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

  const attributes = Object.fromEntries(data.attributes.map(a=>[a.trait_type, a.value]))
  data.attributes = attributes

  //state 
  let {features, ruins, people} = await getJSON(lastState + id + ".json") || {}
  data.state = {
    features: features || [],
    ruins: ruins || [],
    people: people || []
  }

  return data
}

const connect = async(app,isMain=true)=>{
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

export {tokenData, submitChangeQueue, connect}
